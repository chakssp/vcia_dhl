/**
 * SHAPExplainer.js
 * 
 * SHAP (SHapley Additive exPlanations) implementation for ML model interpretability.
 * Provides both local and global explanations for confidence calculations.
 */

export class SHAPExplainer {
  constructor(options = {}) {
    this.config = {
      nSamples: options.nSamples || 100,
      maxFeatures: options.maxFeatures || 20,
      kernelWidth: options.kernelWidth || 0.75,
      randomSeed: options.randomSeed || 42,
      useKernelSHAP: options.useKernelSHAP !== false,
      cacheSize: options.cacheSize || 1000
    };
    
    // SHAP value cache for performance
    this.cache = new Map();
    
    // Feature statistics for baseline
    this.featureStats = new Map();
    
    // Initialize random number generator
    this.rng = this.seedRandom(this.config.randomSeed);
  }
  
  /**
   * Calculate SHAP values for a single instance
   */
  async explainInstance(features, model, prediction) {
    const cacheKey = this.getCacheKey(features);
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Get baseline (expected value)
    const baseline = await this.calculateBaseline(model);
    
    // Generate coalition samples
    const coalitions = this.generateCoalitions(
      Object.keys(features), 
      this.config.nSamples
    );
    
    // Calculate SHAP values using Kernel SHAP
    const shapValues = this.config.useKernelSHAP ?
      await this.kernelSHAP(features, model, coalitions, baseline) :
      await this.treeSHAP(features, model, baseline);
    
    // Validate SHAP values
    this.validateShapValues(shapValues, prediction.overall, baseline);
    
    // Cache result
    if (this.cache.size >= this.config.cacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, shapValues);
    
    return shapValues;
  }
  
  /**
   * Calculate global SHAP explanations across dataset
   */
  async explainGlobal(dataset, model) {
    const globalShap = {
      featureImportance: {},
      interactionEffects: {},
      mainEffects: {},
      samples: []
    };
    
    // Calculate SHAP values for each instance
    for (const instance of dataset) {
      const features = await this.extractFeatures(instance);
      const prediction = await model.calculate(instance);
      const shapValues = await this.explainInstance(features, model, prediction);
      
      globalShap.samples.push({
        id: instance.id,
        shapValues,
        prediction: prediction.overall
      });
      
      // Aggregate feature importance
      for (const [feature, value] of Object.entries(shapValues)) {
        if (!globalShap.featureImportance[feature]) {
          globalShap.featureImportance[feature] = {
            sum: 0,
            absSum: 0,
            count: 0,
            values: []
          };
        }
        
        globalShap.featureImportance[feature].sum += value;
        globalShap.featureImportance[feature].absSum += Math.abs(value);
        globalShap.featureImportance[feature].count += 1;
        globalShap.featureImportance[feature].values.push(value);
      }
    }
    
    // Calculate mean absolute SHAP values
    for (const feature of Object.keys(globalShap.featureImportance)) {
      const stats = globalShap.featureImportance[feature];
      stats.meanAbsolute = stats.absSum / stats.count;
      stats.mean = stats.sum / stats.count;
      stats.std = this.calculateStd(stats.values);
    }
    
    // Calculate interaction effects
    globalShap.interactionEffects = await this.calculateInteractionEffects(
      globalShap.samples,
      model
    );
    
    // Calculate main effects
    globalShap.mainEffects = this.calculateMainEffects(globalShap.featureImportance);
    
    return globalShap;
  }
  
  /**
   * Kernel SHAP implementation
   */
  async kernelSHAP(features, model, coalitions, baseline) {
    const featureNames = Object.keys(features);
    const nFeatures = featureNames.length;
    
    // Prepare data for weighted linear regression
    const X = []; // Coalition matrix
    const y = []; // Model outputs
    const weights = []; // SHAP kernel weights
    
    for (const coalition of coalitions) {
      // Create instance with coalition
      const coalitionFeatures = this.createCoalitionInstance(
        features,
        coalition,
        baseline
      );
      
      // Get model prediction
      const prediction = await this.modelPredict(model, coalitionFeatures);
      
      // Calculate SHAP kernel weight
      const weight = this.shapKernelWeight(coalition, nFeatures);
      
      X.push(coalition);
      y.push(prediction - baseline);
      weights.push(weight);
    }
    
    // Solve weighted linear regression
    const shapValues = this.weightedLinearRegression(X, y, weights, featureNames);
    
    return shapValues;
  }
  
  /**
   * Tree SHAP implementation (simplified for tree-based models)
   */
  async treeSHAP(features, model, baseline) {
    // This is a simplified version for demonstration
    // In production, use optimized tree traversal
    
    const shapValues = {};
    const featureNames = Object.keys(features);
    
    for (const feature of featureNames) {
      // Calculate marginal contribution
      const withFeature = await this.modelPredict(model, features);
      
      const withoutFeature = {
        ...features,
        [feature]: this.getFeatureBaseline(feature)
      };
      const withoutPrediction = await this.modelPredict(model, withoutFeature);
      
      shapValues[feature] = withFeature - withoutPrediction;
    }
    
    return shapValues;
  }
  
  /**
   * Generate coalition samples for Kernel SHAP
   */
  generateCoalitions(features, nSamples) {
    const coalitions = [];
    const nFeatures = features.length;
    
    // Always include empty and full coalitions
    coalitions.push(new Array(nFeatures).fill(0));
    coalitions.push(new Array(nFeatures).fill(1));
    
    // Generate random coalitions
    for (let i = 2; i < nSamples; i++) {
      const coalition = [];
      for (let j = 0; j < nFeatures; j++) {
        coalition.push(this.rng() > 0.5 ? 1 : 0);
      }
      coalitions.push(coalition);
    }
    
    return coalitions;
  }
  
  /**
   * Create instance with coalition features
   */
  createCoalitionInstance(originalFeatures, coalition, baseline) {
    const featureNames = Object.keys(originalFeatures);
    const instance = {};
    
    for (let i = 0; i < featureNames.length; i++) {
      const feature = featureNames[i];
      instance[feature] = coalition[i] === 1 ?
        originalFeatures[feature] :
        this.getFeatureBaseline(feature);
    }
    
    return instance;
  }
  
  /**
   * Calculate SHAP kernel weight
   */
  shapKernelWeight(coalition, nFeatures) {
    const z = coalition.reduce((sum, val) => sum + val, 0);
    
    if (z === 0 || z === nFeatures) {
      return 10000; // Large weight for empty/full coalitions
    }
    
    // SHAP kernel: (M-1) / (C(M,z) * z * (M-z))
    const weight = (nFeatures - 1) / 
      (this.binomialCoefficient(nFeatures, z) * z * (nFeatures - z));
    
    return weight;
  }
  
  /**
   * Weighted linear regression solver
   */
  weightedLinearRegression(X, y, weights, featureNames) {
    // Simplified implementation - in production use optimized linear algebra
    const nFeatures = featureNames.length;
    const shapValues = {};
    
    // For each feature, calculate weighted average contribution
    for (let i = 0; i < nFeatures; i++) {
      let weightedSum = 0;
      let weightSum = 0;
      
      for (let j = 0; j < X.length; j++) {
        if (X[j][i] === 1) {
          weightedSum += y[j] * weights[j];
          weightSum += weights[j];
        }
      }
      
      shapValues[featureNames[i]] = weightSum > 0 ? 
        weightedSum / weightSum : 0;
    }
    
    return shapValues;
  }
  
  /**
   * Get feature importance ranking
   */
  getFeatureImportance(shapValues) {
    const importance = [];
    
    for (const [feature, value] of Object.entries(shapValues)) {
      importance.push({
        feature,
        impact: value,
        absImpact: Math.abs(value),
        direction: value > 0 ? 'positive' : 'negative'
      });
    }
    
    // Sort by absolute impact
    importance.sort((a, b) => b.absImpact - a.absImpact);
    
    return importance;
  }
  
  /**
   * Create SHAP visualization data
   */
  async visualize(shapValues, options = {}) {
    const visualizations = {
      waterfall: this.createWaterfallData(shapValues),
      forceplot: this.createForcePlotData(shapValues),
      summary: this.createSummaryPlotData(shapValues)
    };
    
    if (options.includeInteractions) {
      visualizations.interactions = await this.createInteractionPlotData(shapValues);
    }
    
    return visualizations;
  }
  
  /**
   * Create waterfall chart data
   */
  createWaterfallData(shapValues) {
    const features = this.getFeatureImportance(shapValues);
    const baseline = this.getStoredBaseline();
    
    let cumulative = baseline;
    const data = [{
      feature: 'Base Value',
      value: baseline,
      cumulative: baseline,
      type: 'base'
    }];
    
    for (const feature of features.slice(0, 10)) {
      cumulative += feature.impact;
      data.push({
        feature: feature.feature,
        value: feature.impact,
        cumulative: cumulative,
        type: feature.impact > 0 ? 'positive' : 'negative'
      });
    }
    
    return {
      type: 'waterfall',
      data,
      baseline,
      prediction: cumulative
    };
  }
  
  /**
   * Create force plot data
   */
  createForcePlotData(shapValues) {
    const features = this.getFeatureImportance(shapValues);
    
    const positive = features
      .filter(f => f.impact > 0)
      .map(f => ({
        feature: f.feature,
        value: f.impact,
        width: f.impact
      }));
    
    const negative = features
      .filter(f => f.impact < 0)
      .map(f => ({
        feature: f.feature,
        value: Math.abs(f.impact),
        width: Math.abs(f.impact)
      }));
    
    return {
      type: 'forceplot',
      positive,
      negative,
      baseline: this.getStoredBaseline()
    };
  }
  
  /**
   * Create summary plot data
   */
  createSummaryPlotData(shapValues) {
    const features = this.getFeatureImportance(shapValues);
    
    return {
      type: 'summary',
      features: features.map(f => ({
        name: f.feature,
        importance: f.absImpact,
        value: f.impact,
        samples: 1 // Would be more in global explanation
      }))
    };
  }
  
  /**
   * Calculate interaction effects between features
   */
  async calculateInteractionEffects(samples, model) {
    const interactions = {};
    const features = Object.keys(samples[0].shapValues);
    
    // Calculate pairwise interactions (simplified)
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const f1 = features[i];
        const f2 = features[j];
        const key = `${f1}:${f2}`;
        
        // Calculate interaction strength
        const interaction = await this.calculatePairwiseInteraction(
          samples, 
          f1, 
          f2, 
          model
        );
        
        interactions[key] = interaction;
      }
    }
    
    return interactions;
  }
  
  /**
   * Calculate main effects for features
   */
  calculateMainEffects(featureImportance) {
    const mainEffects = {};
    
    for (const [feature, stats] of Object.entries(featureImportance)) {
      mainEffects[feature] = {
        effect: stats.meanAbsolute,
        direction: stats.mean > 0 ? 'positive' : 'negative',
        consistency: 1 - (stats.std / (stats.meanAbsolute + 0.0001)),
        strength: this.categorizeStrength(stats.meanAbsolute)
      };
    }
    
    return mainEffects;
  }
  
  /**
   * Helper methods
   */
  
  async calculateBaseline(model) {
    // Use cached baseline if available
    const cached = this.getStoredBaseline();
    if (cached !== null) return cached;
    
    // Calculate expected value over background dataset
    // For now, return neutral confidence
    return 0.5;
  }
  
  getFeatureBaseline(feature) {
    // Get baseline value for feature
    const stats = this.featureStats.get(feature);
    if (stats) {
      return stats.mean || stats.mode || 0;
    }
    return 0;
  }
  
  async modelPredict(model, features) {
    // Create a pseudo-file object for prediction
    const pseudoFile = this.createPseudoFile(features);
    const result = await model.calculate(pseudoFile);
    return result.overall;
  }
  
  createPseudoFile(features) {
    // Convert features back to file-like object
    return {
      id: 'shap_temp',
      content: 'x'.repeat(features.contentLength || 100),
      categories: new Array(features.categoryCount || 0),
      lastModified: Date.now() - (features.age || 0)
    };
  }
  
  validateShapValues(shapValues, prediction, baseline) {
    // Verify SHAP values sum to prediction - baseline
    const sum = Object.values(shapValues).reduce((a, b) => a + b, 0);
    const expected = prediction - baseline;
    const tolerance = 0.01;
    
    if (Math.abs(sum - expected) > tolerance) {
      console.warn('SHAP values do not sum correctly:', {
        sum,
        expected,
        difference: sum - expected
      });
    }
  }
  
  getCacheKey(features) {
    // Create stable cache key from features
    return JSON.stringify(
      Object.entries(features)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, Math.round(v * 1000) / 1000])
    );
  }
  
  getStoredBaseline() {
    // Return stored baseline value
    return this.baseline || 0.5;
  }
  
  binomialCoefficient(n, k) {
    if (k > n - k) k = n - k;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return result;
  }
  
  calculateStd(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  categorizeStrength(value) {
    if (value < 0.1) return 'weak';
    if (value < 0.3) return 'moderate';
    if (value < 0.5) return 'strong';
    return 'very strong';
  }
  
  seedRandom(seed) {
    // Simple seedable random number generator
    let state = seed;
    return function() {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }
  
  async calculatePairwiseInteraction(samples, feature1, feature2, model) {
    // Simplified interaction calculation
    let totalInteraction = 0;
    let count = 0;
    
    for (const sample of samples.slice(0, 10)) { // Limit for performance
      const shap1 = sample.shapValues[feature1] || 0;
      const shap2 = sample.shapValues[feature2] || 0;
      
      // Simple interaction measure
      totalInteraction += Math.abs(shap1 * shap2);
      count++;
    }
    
    return {
      strength: count > 0 ? totalInteraction / count : 0,
      features: [feature1, feature2]
    };
  }
  
  async createInteractionPlotData(shapValues) {
    // Create interaction visualization data
    const features = Object.keys(shapValues);
    const matrix = [];
    
    for (let i = 0; i < features.length; i++) {
      const row = [];
      for (let j = 0; j < features.length; j++) {
        if (i === j) {
          row.push(Math.abs(shapValues[features[i]]));
        } else {
          // Simplified - would use actual interaction values
          row.push(Math.abs(shapValues[features[i]] * shapValues[features[j]]) * 0.1);
        }
      }
      matrix.push(row);
    }
    
    return {
      type: 'heatmap',
      features,
      matrix,
      colorScale: 'viridis'
    };
  }
  
  async extractFeatures(instance) {
    // Extract features from instance for global explanation
    // This would match the feature extraction in ExplainableConfidenceCalculator
    return {
      contentLength: instance.content?.length || 0,
      categoryCount: instance.categories?.length || 0,
      age: Date.now() - new Date(instance.lastModified || Date.now()).getTime()
    };
  }
}

export default SHAPExplainer;
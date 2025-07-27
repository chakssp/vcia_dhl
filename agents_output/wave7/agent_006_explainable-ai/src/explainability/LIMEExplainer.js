/**
 * LIMEExplainer.js
 * 
 * LIME (Local Interpretable Model-agnostic Explanations) implementation
 * for generating local explanations of ML model predictions.
 */

export class LIMEExplainer {
  constructor(options = {}) {
    this.config = {
      nSamples: options.nSamples || 500,
      kernelWidth: options.kernelWidth || 0.25,
      featureSelection: options.featureSelection || 'forward',
      maxFeatures: options.maxFeatures || 10,
      discretizeMethod: options.discretizeMethod || 'quartile',
      randomSeed: options.randomSeed || 42,
      ridgeAlpha: options.ridgeAlpha || 1.0
    };
    
    // Feature discretizer for categorical interpretation
    this.discretizer = new FeatureDiscretizer(this.config.discretizeMethod);
    
    // Local model cache
    this.localModelCache = new Map();
    
    // Initialize random number generator
    this.rng = this.seedRandom(this.config.randomSeed);
  }
  
  /**
   * Explain a single instance using LIME
   */
  async explainInstance(instance, predictFunction, originalPrediction) {
    // Extract and discretize features
    const features = await this.extractFeatures(instance);
    const discretizedFeatures = this.discretizer.discretize(features);
    
    // Generate perturbed samples
    const perturbedSamples = this.generatePerturbations(
      features,
      discretizedFeatures,
      this.config.nSamples
    );
    
    // Get predictions for perturbed samples
    const predictions = await this.getPredictions(
      perturbedSamples,
      instance,
      predictFunction
    );
    
    // Calculate sample weights based on distance
    const weights = this.calculateSampleWeights(
      perturbedSamples,
      features,
      this.config.kernelWidth
    );
    
    // Fit local interpretable model
    const localModel = this.fitLocalModel(
      perturbedSamples,
      predictions,
      weights,
      discretizedFeatures
    );
    
    // Select most important features
    const selectedFeatures = this.selectFeatures(
      localModel,
      this.config.maxFeatures
    );
    
    // Create explanation object
    const explanation = new LIMEExplanation(
      instance,
      originalPrediction,
      localModel,
      selectedFeatures,
      discretizedFeatures,
      features
    );
    
    return explanation;
  }
  
  /**
   * Generate perturbed samples around the instance
   */
  generatePerturbations(originalFeatures, discretizedFeatures, nSamples) {
    const perturbations = [];
    const featureNames = Object.keys(originalFeatures);
    
    // Always include the original instance
    perturbations.push(this.createBinaryVector(discretizedFeatures, discretizedFeatures));
    
    // Generate random perturbations
    for (let i = 1; i < nSamples; i++) {
      const perturbation = {};
      const binaryRepresentation = [];
      
      for (const feature of featureNames) {
        // Randomly decide whether to keep original value
        const keepOriginal = this.rng() > 0.5;
        
        if (keepOriginal) {
          perturbation[feature] = originalFeatures[feature];
          binaryRepresentation.push(1);
        } else {
          // Sample from feature distribution
          perturbation[feature] = this.sampleFeature(feature, originalFeatures[feature]);
          binaryRepresentation.push(0);
        }
      }
      
      perturbations.push({
        features: perturbation,
        binary: binaryRepresentation
      });
    }
    
    return perturbations;
  }
  
  /**
   * Get predictions for perturbed samples
   */
  async getPredictions(perturbedSamples, originalInstance, predictFunction) {
    const predictions = [];
    
    for (const sample of perturbedSamples) {
      // Create modified instance
      const modifiedInstance = this.createModifiedInstance(
        originalInstance,
        sample.features
      );
      
      // Get prediction
      const prediction = await predictFunction(modifiedInstance);
      predictions.push(prediction);
    }
    
    return predictions;
  }
  
  /**
   * Calculate weights for samples based on distance from original
   */
  calculateSampleWeights(samples, originalFeatures, kernelWidth) {
    const weights = [];
    const originalVector = this.featuresToVector(originalFeatures);
    
    for (const sample of samples) {
      const sampleVector = this.featuresToVector(sample.features);
      const distance = this.euclideanDistance(originalVector, sampleVector);
      
      // Exponential kernel
      const weight = Math.exp(-(distance * distance) / (kernelWidth * kernelWidth));
      weights.push(weight);
    }
    
    return weights;
  }
  
  /**
   * Fit a local linear model
   */
  fitLocalModel(samples, predictions, weights, discretizedFeatures) {
    // Prepare data for weighted linear regression
    const X = samples.map(s => s.binary);
    const y = predictions;
    
    // Weighted ridge regression
    const coefficients = this.weightedRidgeRegression(X, y, weights, this.config.ridgeAlpha);
    
    // Create feature names for binary representation
    const binaryFeatureNames = this.createBinaryFeatureNames(discretizedFeatures);
    
    // Build local model
    const localModel = {
      coefficients,
      intercept: this.calculateIntercept(X, y, weights, coefficients),
      features: binaryFeatureNames,
      r2Score: this.calculateR2Score(X, y, predictions, coefficients, weights)
    };
    
    return localModel;
  }
  
  /**
   * Select most important features
   */
  selectFeatures(localModel, maxFeatures) {
    const featureImportance = [];
    
    // Calculate feature importance (absolute coefficient values)
    for (let i = 0; i < localModel.features.length; i++) {
      featureImportance.push({
        feature: localModel.features[i],
        coefficient: localModel.coefficients[i],
        importance: Math.abs(localModel.coefficients[i]),
        index: i
      });
    }
    
    // Sort by importance
    featureImportance.sort((a, b) => b.importance - a.importance);
    
    // Select top features
    const selected = featureImportance.slice(0, maxFeatures);
    
    // Apply feature selection method
    if (this.config.featureSelection === 'forward') {
      return this.forwardSelection(selected, localModel);
    } else if (this.config.featureSelection === 'lasso') {
      return this.lassoSelection(selected, localModel);
    }
    
    return selected;
  }
  
  /**
   * Weighted Ridge Regression implementation
   */
  weightedRidgeRegression(X, y, weights, alpha) {
    const nFeatures = X[0].length;
    const nSamples = X.length;
    
    // Create weighted design matrix
    const XtWX = this.createMatrix(nFeatures, nFeatures, 0);
    const XtWy = new Array(nFeatures).fill(0);
    
    // Calculate X^T * W * X and X^T * W * y
    for (let i = 0; i < nSamples; i++) {
      const w = weights[i];
      
      for (let j = 0; j < nFeatures; j++) {
        XtWy[j] += X[i][j] * y[i] * w;
        
        for (let k = 0; k < nFeatures; k++) {
          XtWX[j][k] += X[i][j] * X[i][k] * w;
        }
      }
    }
    
    // Add ridge regularization
    for (let i = 0; i < nFeatures; i++) {
      XtWX[i][i] += alpha;
    }
    
    // Solve linear system (simplified - use proper linear algebra in production)
    const coefficients = this.solveLinearSystem(XtWX, XtWy);
    
    return coefficients;
  }
  
  /**
   * Extract features from instance
   */
  async extractFeatures(instance) {
    return {
      // Text features
      contentLength: instance.content?.length || 0,
      wordCount: this.countWords(instance.content),
      avgWordLength: this.calculateAvgWordLength(instance.content),
      sentenceCount: this.countSentences(instance.content),
      
      // Structural features
      hasCategories: instance.categories?.length > 0 ? 1 : 0,
      categoryCount: instance.categories?.length || 0,
      
      // Temporal features  
      daysSinceModified: this.daysSince(instance.lastModified),
      isRecent: this.daysSince(instance.lastModified) < 7 ? 1 : 0,
      
      // Content features
      hasKeywords: this.hasImportantKeywords(instance.content) ? 1 : 0,
      technicalScore: this.calculateTechnicalScore(instance.content)
    };
  }
  
  /**
   * Create modified instance with perturbed features
   */
  createModifiedInstance(originalInstance, perturbedFeatures) {
    // Create a copy of the original instance
    const modified = { ...originalInstance };
    
    // Apply feature perturbations
    // This is simplified - in practice, would need to reverse-engineer features
    if (perturbedFeatures.contentLength !== undefined) {
      const ratio = perturbedFeatures.contentLength / (originalInstance.content?.length || 1);
      modified.content = this.adjustContent(originalInstance.content, ratio);
    }
    
    if (perturbedFeatures.categoryCount !== undefined) {
      modified.categories = new Array(Math.round(perturbedFeatures.categoryCount));
    }
    
    if (perturbedFeatures.daysSinceModified !== undefined) {
      const daysAgo = perturbedFeatures.daysSinceModified;
      modified.lastModified = new Date(Date.now() - daysAgo * 86400000).toISOString();
    }
    
    return modified;
  }
  
  /**
   * Create explanation visualization
   */
  async visualize(explanation) {
    const visualizations = {
      barChart: this.createBarChart(explanation),
      textHighlight: this.createTextHighlight(explanation),
      decisionPlot: this.createDecisionPlot(explanation)
    };
    
    return visualizations;
  }
  
  /**
   * Create bar chart visualization data
   */
  createBarChart(explanation) {
    const features = explanation.getTopFeatures(10);
    
    return {
      type: 'horizontal-bar',
      data: features.map(f => ({
        feature: f.description,
        value: f.contribution,
        positive: f.contribution > 0,
        label: `${f.contribution > 0 ? '+' : ''}${(f.contribution * 100).toFixed(1)}%`
      })),
      baseline: explanation.intercept,
      prediction: explanation.prediction
    };
  }
  
  /**
   * Create text highlight visualization
   */
  createTextHighlight(explanation) {
    // Identify which parts of text contribute to prediction
    const highlights = [];
    
    if (explanation.features.hasKeywords && explanation.getFeatureContribution('hasKeywords') > 0) {
      // Highlight important keywords
      const keywords = this.identifyKeywords(explanation.instance.content);
      highlights.push(...keywords.map(kw => ({
        text: kw.word,
        importance: kw.score * explanation.getFeatureContribution('hasKeywords'),
        type: 'keyword'
      })));
    }
    
    return {
      type: 'text-highlight',
      text: explanation.instance.content,
      highlights,
      colorScale: {
        positive: '#4CAF50',
        negative: '#F44336',
        neutral: '#9E9E9E'
      }
    };
  }
  
  /**
   * Create decision plot visualization
   */
  createDecisionPlot(explanation) {
    const features = explanation.getTopFeatures();
    let cumulative = explanation.intercept;
    
    const path = [{
      x: 0,
      y: cumulative,
      feature: 'Base'
    }];
    
    features.forEach((feature, index) => {
      cumulative += feature.contribution;
      path.push({
        x: index + 1,
        y: cumulative,
        feature: feature.name,
        contribution: feature.contribution
      });
    });
    
    return {
      type: 'decision-plot',
      path,
      prediction: explanation.prediction,
      threshold: 0.5
    };
  }
  
  /**
   * Helper methods
   */
  
  createBinaryVector(features, reference) {
    const vector = [];
    for (const feature of Object.keys(features)) {
      vector.push(features[feature] === reference[feature] ? 1 : 0);
    }
    return { features, binary: vector };
  }
  
  sampleFeature(featureName, originalValue) {
    // Sample from feature distribution
    // Simplified - in production, use actual feature distributions
    
    if (typeof originalValue === 'number') {
      // Sample from normal distribution around mean
      const std = Math.abs(originalValue * 0.3);
      return originalValue + this.randomNormal() * std;
    } else if (typeof originalValue === 'boolean') {
      // Flip boolean randomly
      return this.rng() > 0.5;
    }
    
    return originalValue;
  }
  
  featuresToVector(features) {
    return Object.values(features).map(v => 
      typeof v === 'number' ? v : (v ? 1 : 0)
    );
  }
  
  euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }
  
  createBinaryFeatureNames(discretizedFeatures) {
    const names = [];
    for (const [feature, value] of Object.entries(discretizedFeatures)) {
      names.push(`${feature}=${value}`);
    }
    return names;
  }
  
  calculateIntercept(X, y, weights, coefficients) {
    let weightedSum = 0;
    let weightSum = 0;
    
    for (let i = 0; i < X.length; i++) {
      let prediction = 0;
      for (let j = 0; j < coefficients.length; j++) {
        prediction += X[i][j] * coefficients[j];
      }
      
      weightedSum += weights[i] * (y[i] - prediction);
      weightSum += weights[i];
    }
    
    return weightSum > 0 ? weightedSum / weightSum : 0;
  }
  
  calculateR2Score(X, y, predictions, coefficients, weights) {
    // Weighted R-squared
    let ssRes = 0;
    let ssTot = 0;
    let weightedMean = 0;
    let weightSum = 0;
    
    // Calculate weighted mean
    for (let i = 0; i < y.length; i++) {
      weightedMean += weights[i] * y[i];
      weightSum += weights[i];
    }
    weightedMean /= weightSum;
    
    // Calculate residuals and total sum of squares
    for (let i = 0; i < X.length; i++) {
      let prediction = 0;
      for (let j = 0; j < coefficients.length; j++) {
        prediction += X[i][j] * coefficients[j];
      }
      
      ssRes += weights[i] * Math.pow(y[i] - prediction, 2);
      ssTot += weights[i] * Math.pow(y[i] - weightedMean, 2);
    }
    
    return ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  }
  
  forwardSelection(features, localModel) {
    // Simple forward selection
    return features;
  }
  
  lassoSelection(features, localModel) {
    // Simplified LASSO selection
    return features.filter(f => f.importance > 0.01);
  }
  
  createMatrix(rows, cols, fill = 0) {
    return Array(rows).fill(null).map(() => Array(cols).fill(fill));
  }
  
  solveLinearSystem(A, b) {
    // Simplified linear system solver
    // In production, use proper numerical methods
    const n = b.length;
    const x = new Array(n);
    
    // Gaussian elimination (simplified)
    for (let i = 0; i < n; i++) {
      x[i] = b[i] / (A[i][i] || 1);
    }
    
    return x;
  }
  
  countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
  
  calculateAvgWordLength(text) {
    if (!text) return 0;
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 0;
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    return totalLength / words.length;
  }
  
  countSentences(text) {
    if (!text) return 0;
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }
  
  daysSince(date) {
    if (!date) return 0;
    const msPerDay = 86400000;
    return Math.floor((Date.now() - new Date(date).getTime()) / msPerDay);
  }
  
  hasImportantKeywords(text) {
    if (!text) return false;
    const keywords = ['decision', 'breakthrough', 'insight', 'critical', 'important'];
    const lowerText = text.toLowerCase();
    return keywords.some(kw => lowerText.includes(kw));
  }
  
  calculateTechnicalScore(text) {
    if (!text) return 0;
    const technicalTerms = ['algorithm', 'implementation', 'optimization', 'architecture', 'framework'];
    const lowerText = text.toLowerCase();
    let score = 0;
    
    for (const term of technicalTerms) {
      if (lowerText.includes(term)) score += 0.2;
    }
    
    return Math.min(1, score);
  }
  
  adjustContent(content, ratio) {
    if (!content) return '';
    const targetLength = Math.round(content.length * ratio);
    if (ratio > 1) {
      // Repeat content
      return content.repeat(Math.ceil(ratio)).substring(0, targetLength);
    } else {
      // Truncate content
      return content.substring(0, targetLength);
    }
  }
  
  identifyKeywords(text) {
    if (!text) return [];
    const keywords = ['decision', 'breakthrough', 'insight', 'critical', 'important'];
    const found = [];
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
      let index = lowerText.indexOf(keyword);
      while (index !== -1) {
        found.push({
          word: keyword,
          position: index,
          score: 1.0
        });
        index = lowerText.indexOf(keyword, index + 1);
      }
    }
    
    return found;
  }
  
  seedRandom(seed) {
    let state = seed;
    return function() {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }
  
  randomNormal() {
    // Box-Muller transform for normal distribution
    const u1 = this.rng();
    const u2 = this.rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/**
 * Feature discretizer for interpretable explanations
 */
class FeatureDiscretizer {
  constructor(method = 'quartile') {
    this.method = method;
    this.bins = new Map();
  }
  
  discretize(features) {
    const discretized = {};
    
    for (const [feature, value] of Object.entries(features)) {
      if (typeof value === 'number') {
        discretized[feature] = this.discretizeNumeric(feature, value);
      } else if (typeof value === 'boolean') {
        discretized[feature] = value ? 'True' : 'False';
      } else {
        discretized[feature] = String(value);
      }
    }
    
    return discretized;
  }
  
  discretizeNumeric(feature, value) {
    if (this.method === 'quartile') {
      if (value < 0.25) return 'Very Low';
      if (value < 0.5) return 'Low';
      if (value < 0.75) return 'Medium';
      return 'High';
    } else if (this.method === 'decile') {
      const decile = Math.floor(value * 10) / 10;
      return `${(decile * 100).toFixed(0)}-${((decile + 0.1) * 100).toFixed(0)}%`;
    }
    
    return value.toFixed(2);
  }
}

/**
 * LIME Explanation class
 */
class LIMEExplanation {
  constructor(instance, prediction, localModel, selectedFeatures, discretizedFeatures, originalFeatures) {
    this.instance = instance;
    this.prediction = prediction;
    this.localModel = localModel;
    this.selectedFeatures = selectedFeatures;
    this.discretizedFeatures = discretizedFeatures;
    this.originalFeatures = originalFeatures;
    this.intercept = localModel.intercept;
  }
  
  getTopFeatures(n = 10) {
    return this.selectedFeatures.slice(0, n).map(f => ({
      name: f.feature,
      contribution: f.coefficient,
      value: this.discretizedFeatures[f.feature.split('=')[0]],
      description: this.getFeatureDescription(f.feature)
    }));
  }
  
  getFeatureContribution(featureName) {
    const feature = this.selectedFeatures.find(f => 
      f.feature.startsWith(featureName)
    );
    return feature ? feature.coefficient : 0;
  }
  
  getFeatureDescription(feature) {
    // Convert technical feature names to human-readable descriptions
    const [name, value] = feature.split('=');
    
    const descriptions = {
      contentLength: 'Content length',
      wordCount: 'Word count',
      categoryCount: 'Number of categories',
      hasCategories: 'Has categories',
      daysSinceModified: 'Days since modified',
      isRecent: 'Recently modified',
      hasKeywords: 'Contains important keywords',
      technicalScore: 'Technical content score'
    };
    
    const desc = descriptions[name] || name;
    return value ? `${desc} is ${value}` : desc;
  }
  
  getLocalImportance() {
    return this.selectedFeatures.map(f => ({
      feature: f.feature.split('=')[0],
      value: this.discretizedFeatures[f.feature.split('=')[0]],
      weight: f.coefficient,
      operator: '='
    }));
  }
}

export default LIMEExplainer;
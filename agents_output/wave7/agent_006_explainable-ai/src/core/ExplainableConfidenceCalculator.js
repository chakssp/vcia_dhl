/**
 * ExplainableConfidenceCalculator.js
 * 
 * Enhanced confidence calculator with comprehensive explainability features.
 * Integrates SHAP, LIME, attention mechanisms, and natural language explanations.
 */

import { ConfidenceCalculator } from '../../../core/ConfidenceCalculator.js';
import { SHAPExplainer } from '../explainability/SHAPExplainer.js';
import { LIMEExplainer } from '../explainability/LIMEExplainer.js';
import { AttentionAnalyzer } from '../explainability/AttentionAnalyzer.js';
import { NaturalLanguageExplainer } from '../explainability/NaturalLanguageExplainer.js';
import { CounterfactualGenerator } from '../explainability/CounterfactualGenerator.js';
import { DecisionTreeVisualizer } from '../visualization/DecisionTreeVisualizer.js';

export class ExplainableConfidenceCalculator extends ConfidenceCalculator {
  constructor(options = {}) {
    super(options);
    
    // Explainability components
    this.explainers = {
      shap: options.enableSHAP !== false ? new SHAPExplainer() : null,
      lime: options.enableLIME !== false ? new LIMEExplainer() : null,
      attention: new AttentionAnalyzer(),
      nlp: new NaturalLanguageExplainer(),
      counterfactual: new CounterfactualGenerator(),
      decisionTree: new DecisionTreeVisualizer()
    };
    
    // Configuration
    this.config = {
      explainabilityLevel: options.explainabilityLevel || 'full', // minimal, standard, full
      visualizationEnabled: options.visualizationEnabled !== false,
      naturalLanguageEnabled: options.naturalLanguageEnabled !== false,
      counterfactualsEnabled: options.counterfactualsEnabled !== false,
      maxCounterfactuals: options.maxCounterfactuals || 3,
      language: options.language || 'en'
    };
    
    // Explanation cache
    this.explanationCache = new Map();
    
    // Decision path recorder
    this.decisionPaths = new Map();
  }
  
  async calculate(file, options = {}) {
    const startTime = performance.now();
    
    // Start recording decision path
    const decisionPath = this.startDecisionPath(file.id);
    
    // Get base calculation from parent
    const baseResult = await super.calculate(file);
    
    // Record base calculation in decision path
    decisionPath.addNode('base_calculation', {
      result: baseResult,
      timestamp: Date.now()
    });
    
    // Generate explanations based on configuration
    const explanations = await this.generateExplanations(file, baseResult, decisionPath);
    
    // Enhance result with explanations
    const explainableResult = {
      ...baseResult,
      explanations,
      decisionPath: decisionPath.serialize(),
      metadata: {
        ...baseResult.metadata,
        explainabilityVersion: '1.0.0',
        calculationTime: performance.now() - startTime,
        explainabilityLevel: this.config.explainabilityLevel
      }
    };
    
    // Cache explanations
    this.explanationCache.set(file.id, explanations);
    
    // Emit explainable result
    KC.EventBus.emit('ml:confidence:explained', explainableResult);
    
    return explainableResult;
  }
  
  async generateExplanations(file, baseResult, decisionPath) {
    const explanations = {
      timestamp: Date.now(),
      fileId: file.id
    };
    
    // Parallel explanation generation
    const promises = [];
    
    // SHAP explanations
    if (this.explainers.shap && this.shouldGenerateSHAP()) {
      promises.push(
        this.generateSHAPExplanation(file, baseResult)
          .then(shap => {
            explanations.shap = shap;
            decisionPath.addNode('shap_analysis', { result: shap });
          })
      );
    }
    
    // LIME explanations
    if (this.explainers.lime && this.shouldGenerateLIME()) {
      promises.push(
        this.generateLIMEExplanation(file, baseResult)
          .then(lime => {
            explanations.lime = lime;
            decisionPath.addNode('lime_analysis', { result: lime });
          })
      );
    }
    
    // Attention analysis
    promises.push(
      this.analyzeAttention(file, baseResult)
        .then(attention => {
          explanations.attention = attention;
          decisionPath.addNode('attention_analysis', { result: attention });
        })
    );
    
    // Wait for parallel explanations
    await Promise.all(promises);
    
    // Sequential explanations that depend on previous results
    
    // Counterfactuals (depends on feature importance)
    if (this.config.counterfactualsEnabled && explanations.shap) {
      explanations.counterfactuals = await this.generateCounterfactuals(
        file, 
        baseResult, 
        explanations.shap
      );
      decisionPath.addNode('counterfactual_generation', { 
        result: explanations.counterfactuals 
      });
    }
    
    // Natural language explanation (depends on all other explanations)
    if (this.config.naturalLanguageEnabled) {
      explanations.naturalLanguage = await this.generateNaturalLanguage(
        file,
        baseResult,
        explanations
      );
      decisionPath.addNode('nl_generation', { 
        result: explanations.naturalLanguage 
      });
    }
    
    // Decision tree visualization
    if (this.config.visualizationEnabled) {
      explanations.visualizations = await this.generateVisualizations(
        file,
        baseResult,
        explanations,
        decisionPath
      );
    }
    
    return explanations;
  }
  
  async generateSHAPExplanation(file, result) {
    try {
      // Create feature vector from file
      const features = await this.extractFeatures(file);
      
      // Get SHAP values
      const shapValues = await this.explainers.shap.explainInstance(
        features,
        this.algorithms,
        result
      );
      
      // Get feature importance ranking
      const importance = this.explainers.shap.getFeatureImportance(shapValues);
      
      // Identify key contributors
      const keyContributors = importance
        .filter(f => Math.abs(f.impact) > 0.1)
        .slice(0, 5);
      
      return {
        values: shapValues,
        importance,
        keyContributors,
        summary: this.summarizeSHAP(keyContributors, result.overall),
        visualization: this.config.visualizationEnabled ? 
          await this.explainers.shap.visualize(shapValues) : null
      };
    } catch (error) {
      console.error('SHAP explanation error:', error);
      return { error: error.message };
    }
  }
  
  async generateLIMEExplanation(file, result) {
    try {
      // Generate LIME explanation
      const limeExplanation = await this.explainers.lime.explainInstance(
        file,
        this.predictFunction.bind(this),
        result
      );
      
      // Extract local feature importance
      const localImportance = limeExplanation.getLocalImportance();
      
      // Identify decision rules
      const rules = this.extractDecisionRules(localImportance);
      
      return {
        explanation: limeExplanation,
        localImportance,
        rules,
        summary: this.summarizeLIME(rules, result.overall),
        visualization: this.config.visualizationEnabled ?
          await this.explainers.lime.visualize(limeExplanation) : null
      };
    } catch (error) {
      console.error('LIME explanation error:', error);
      return { error: error.message };
    }
  }
  
  async analyzeAttention(file, result) {
    try {
      // Analyze attention patterns across dimensions
      const attentionWeights = await this.explainers.attention.analyze(
        file,
        result.dimensions
      );
      
      // Identify focus areas
      const focusAreas = this.identifyFocusAreas(attentionWeights);
      
      // Calculate attention entropy (concentration measure)
      const entropy = this.calculateAttentionEntropy(attentionWeights);
      
      return {
        weights: attentionWeights,
        focusAreas,
        entropy,
        concentrated: entropy < 0.5, // Low entropy = concentrated attention
        heatmap: this.config.visualizationEnabled ?
          await this.explainers.attention.generateHeatmap(attentionWeights) : null
      };
    } catch (error) {
      console.error('Attention analysis error:', error);
      return { error: error.message };
    }
  }
  
  async generateCounterfactuals(file, result, shapExplanation) {
    try {
      // Generate counterfactual scenarios
      const counterfactuals = await this.explainers.counterfactual.generate(
        file,
        result,
        {
          targetConfidence: result.overall > 0.8 ? 0.5 : 0.9,
          maxChanges: 3,
          featureImportance: shapExplanation.importance,
          maxScenarios: this.config.maxCounterfactuals
        }
      );
      
      // Analyze each counterfactual
      const analyzed = await Promise.all(
        counterfactuals.map(async cf => ({
          ...cf,
          feasibility: await this.assessFeasibility(cf),
          impact: this.calculateImpact(result.overall, cf.predictedConfidence)
        }))
      );
      
      return {
        scenarios: analyzed,
        recommendations: this.extractRecommendations(analyzed),
        summary: this.summarizeCounterfactuals(analyzed)
      };
    } catch (error) {
      console.error('Counterfactual generation error:', error);
      return { error: error.message };
    }
  }
  
  async generateNaturalLanguage(file, result, explanations) {
    try {
      // Create explanation context
      const context = {
        file,
        result,
        explanations,
        language: this.config.language
      };
      
      // Generate different explanation sections
      const sections = {
        summary: await this.explainers.nlp.generateSummary(context),
        confidence: await this.explainers.nlp.explainConfidence(result),
        factors: await this.explainers.nlp.explainFactors(explanations),
        recommendations: await this.explainers.nlp.generateRecommendations(context)
      };
      
      // Combine into coherent narrative
      const narrative = await this.explainers.nlp.combineNarrative(sections);
      
      return {
        sections,
        narrative,
        readabilityScore: this.calculateReadability(narrative),
        language: this.config.language
      };
    } catch (error) {
      console.error('Natural language generation error:', error);
      return { error: error.message };
    }
  }
  
  async generateVisualizations(file, result, explanations, decisionPath) {
    const visualizations = {};
    
    try {
      // Decision tree visualization
      visualizations.decisionTree = await this.explainers.decisionTree.visualize(
        decisionPath,
        result
      );
      
      // Feature importance chart
      if (explanations.shap) {
        visualizations.featureImportance = await this.createFeatureImportanceChart(
          explanations.shap.importance
        );
      }
      
      // Confidence evolution
      visualizations.confidenceEvolution = await this.createConfidenceEvolutionChart(
        file.id,
        result
      );
      
      // Dimension radar chart
      visualizations.dimensionRadar = await this.createDimensionRadarChart(
        result.dimensions
      );
      
      return visualizations;
    } catch (error) {
      console.error('Visualization generation error:', error);
      return { error: error.message };
    }
  }
  
  // Helper methods
  
  startDecisionPath(fileId) {
    const path = new DecisionPath(fileId);
    this.decisionPaths.set(fileId, path);
    return path;
  }
  
  async extractFeatures(file) {
    // Extract numerical features for SHAP/LIME
    const features = {
      // Content features
      contentLength: file.content.length,
      wordCount: file.content.split(/\s+/).length,
      uniqueWords: new Set(file.content.toLowerCase().split(/\s+/)).size,
      
      // Structural features
      paragraphCount: file.content.split('\n\n').length,
      avgSentenceLength: this.calculateAvgSentenceLength(file.content),
      
      // Semantic features
      categoryCount: file.categories?.length || 0,
      hasCategories: file.categories?.length > 0 ? 1 : 0,
      
      // Temporal features
      age: Date.now() - new Date(file.lastModified).getTime(),
      recentlyModified: Date.now() - new Date(file.lastModified).getTime() < 86400000 ? 1 : 0
    };
    
    return features;
  }
  
  summarizeSHAP(keyContributors, overallScore) {
    const contributions = keyContributors.map(c => 
      `${c.feature} (${c.impact > 0 ? '+' : ''}${(c.impact * 100).toFixed(1)}%)`
    ).join(', ');
    
    return `The confidence score of ${(overallScore * 100).toFixed(1)}% is primarily driven by: ${contributions}.`;
  }
  
  summarizeLIME(rules, overallScore) {
    const ruleDescriptions = rules.slice(0, 3).map(r => r.description).join('; ');
    return `Local analysis shows that ${ruleDescriptions} contribute to the ${(overallScore * 100).toFixed(1)}% confidence score.`;
  }
  
  summarizeCounterfactuals(scenarios) {
    if (scenarios.length === 0) return 'No alternative scenarios found.';
    
    const bestScenario = scenarios[0];
    return `To achieve ${(bestScenario.predictedConfidence * 100).toFixed(1)}% confidence, ` +
           `consider: ${bestScenario.changes.map(c => c.description).join(', ')}.`;
  }
  
  identifyFocusAreas(attentionWeights) {
    // Find areas with high attention weights
    const threshold = 0.7;
    return Object.entries(attentionWeights)
      .filter(([_, weight]) => weight > threshold)
      .map(([area, weight]) => ({ area, weight, intensity: 'high' }));
  }
  
  calculateAttentionEntropy(weights) {
    const values = Object.values(weights);
    const sum = values.reduce((a, b) => a + b, 0);
    
    if (sum === 0) return 1; // Maximum entropy
    
    // Normalize and calculate entropy
    const normalized = values.map(v => v / sum);
    return -normalized.reduce((entropy, p) => {
      if (p > 0) entropy += p * Math.log2(p);
      return entropy;
    }, 0) / Math.log2(normalized.length);
  }
  
  shouldGenerateSHAP() {
    return this.config.explainabilityLevel === 'full' || 
           this.config.explainabilityLevel === 'standard';
  }
  
  shouldGenerateLIME() {
    return this.config.explainabilityLevel === 'full';
  }
  
  async predictFunction(perturbedFile) {
    // Prediction function for LIME
    const result = await super.calculate(perturbedFile);
    return result.overall;
  }
  
  extractDecisionRules(localImportance) {
    // Extract human-readable rules from LIME importance
    return localImportance
      .filter(f => Math.abs(f.weight) > 0.1)
      .map(f => ({
        feature: f.feature,
        condition: f.value,
        impact: f.weight,
        description: `${f.feature} ${f.operator} ${f.value}`
      }));
  }
  
  async assessFeasibility(counterfactual) {
    // Assess how feasible/realistic the counterfactual changes are
    let feasibilityScore = 1.0;
    
    for (const change of counterfactual.changes) {
      // Penalize large changes
      if (Math.abs(change.delta) > 0.5) {
        feasibilityScore *= 0.7;
      }
      
      // Penalize changes to immutable features
      if (change.feature.includes('historical') || change.feature.includes('created')) {
        feasibilityScore *= 0.3;
      }
    }
    
    return feasibilityScore;
  }
  
  calculateImpact(current, predicted) {
    return {
      absolute: predicted - current,
      relative: (predicted - current) / current,
      significant: Math.abs(predicted - current) > 0.1
    };
  }
  
  extractRecommendations(counterfactuals) {
    // Extract actionable recommendations from counterfactuals
    const feasible = counterfactuals.filter(cf => cf.feasibility > 0.5);
    
    return feasible.map(cf => ({
      action: cf.changes.map(c => c.description).join(' and '),
      expectedOutcome: `Increase confidence to ${(cf.predictedConfidence * 100).toFixed(1)}%`,
      effort: cf.changes.length,
      feasibility: cf.feasibility
    }));
  }
  
  calculateReadability(text) {
    // Simple readability score (Flesch Reading Ease approximation)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Flesch Reading Ease formula
    const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
    
    // Normalize to 0-100
    return Math.max(0, Math.min(100, score));
  }
  
  countSyllables(word) {
    // Simple syllable counting heuristic
    word = word.toLowerCase();
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = 'aeiou'.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent e
    if (word.endsWith('e') && count > 1) {
      count--;
    }
    
    return Math.max(1, count);
  }
  
  calculateAvgSentenceLength(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    const totalWords = sentences.reduce((sum, sentence) => {
      return sum + sentence.split(/\s+/).filter(w => w.length > 0).length;
    }, 0);
    
    return totalWords / sentences.length;
  }
  
  async createFeatureImportanceChart(importance) {
    // Create feature importance visualization data
    return {
      type: 'bar',
      data: importance.slice(0, 10).map(f => ({
        feature: f.feature,
        importance: Math.abs(f.impact),
        positive: f.impact > 0
      })),
      options: {
        title: 'Feature Importance',
        xLabel: 'Impact on Confidence',
        yLabel: 'Features',
        colors: ['#4CAF50', '#F44336'] // Green for positive, red for negative
      }
    };
  }
  
  async createConfidenceEvolutionChart(fileId, currentResult) {
    // Get historical data
    const history = await KC.ConfidenceTracker?.getHistory(fileId) || [];
    
    return {
      type: 'line',
      data: history.map((h, i) => ({
        iteration: i + 1,
        confidence: h.overall,
        timestamp: h.timestamp
      })).concat([{
        iteration: history.length + 1,
        confidence: currentResult.overall,
        timestamp: Date.now()
      }]),
      options: {
        title: 'Confidence Evolution',
        xLabel: 'Iteration',
        yLabel: 'Confidence Score',
        showPoints: true,
        showTrend: true
      }
    };
  }
  
  async createDimensionRadarChart(dimensions) {
    return {
      type: 'radar',
      data: Object.entries(dimensions).map(([dim, score]) => ({
        dimension: dim,
        score: score,
        label: this.formatDimensionLabel(dim)
      })),
      options: {
        title: 'Multi-dimensional Confidence',
        scale: { min: 0, max: 1 },
        showValues: true
      }
    };
  }
  
  formatDimensionLabel(dimension) {
    // Convert dimension key to readable label
    return dimension
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

/**
 * Decision path tracking for visualization
 */
class DecisionPath {
  constructor(fileId) {
    this.fileId = fileId;
    this.nodes = [];
    this.edges = [];
    this.currentNodeId = 0;
  }
  
  addNode(type, data) {
    const node = {
      id: this.currentNodeId++,
      type,
      data,
      timestamp: Date.now()
    };
    
    // Add edge from previous node
    if (this.nodes.length > 0) {
      this.edges.push({
        from: this.nodes[this.nodes.length - 1].id,
        to: node.id,
        label: type
      });
    }
    
    this.nodes.push(node);
    return node;
  }
  
  serialize() {
    return {
      fileId: this.fileId,
      nodes: this.nodes,
      edges: this.edges,
      duration: this.nodes.length > 0 ? 
        this.nodes[this.nodes.length - 1].timestamp - this.nodes[0].timestamp : 0
    };
  }
}

export default ExplainableConfidenceCalculator;
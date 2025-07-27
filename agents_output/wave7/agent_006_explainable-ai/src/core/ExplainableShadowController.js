/**
 * ExplainableShadowController.js
 * 
 * Enhanced shadow mode controller with comprehensive explainability comparisons.
 * Tracks and explains differences between traditional and ML-based analysis.
 */

import { ShadowModeController } from '../../../core/ShadowModeController.js';
import { ExplanationComparator } from '../explainability/ExplanationComparator.js';
import { DivergenceAnalyzer } from '../explainability/DivergenceAnalyzer.js';
import { TransparencyReporter } from '../visualization/TransparencyReporter.js';

export class ExplainableShadowController extends ShadowModeController {
  constructor(options = {}) {
    super(options);
    
    // Explainability components
    this.explanationComparator = new ExplanationComparator();
    this.divergenceAnalyzer = new DivergenceAnalyzer();
    this.transparencyReporter = new TransparencyReporter();
    
    // Enhanced configuration
    this.config = {
      ...this.config,
      explainDivergences: options.explainDivergences !== false,
      trackDecisionPaths: options.trackDecisionPaths !== false,
      generateComparisons: options.generateComparisons !== false,
      transparencyLevel: options.transparencyLevel || 'full', // minimal, standard, full
      alertThreshold: options.alertThreshold || 0.15 // 15% divergence triggers alert
    };
    
    // Comparison storage
    this.comparisons = new Map();
    
    // Decision path tracking
    this.decisionPaths = {
      traditional: new Map(),
      ml: new Map()
    };
    
    // Divergence patterns
    this.divergencePatterns = new Map();
  }
  
  /**
   * Run shadow analysis with explainability
   */
  async runShadowAnalysis(traditionalResult) {
    const startTime = performance.now();
    
    try {
      // Run ML calculation with explanations
      const mlResult = await this.calculator.calculate(traditionalResult.file);
      
      // Track in background
      await this.tracker.track(mlResult);
      
      // Compare results with explainability
      const comparison = await this.compareWithExplanations(
        traditionalResult,
        mlResult
      );
      
      // Analyze divergences if significant
      if (comparison.divergence > this.config.alertThreshold) {
        const divergenceAnalysis = await this.analyzeDivergence(
          traditionalResult,
          mlResult,
          comparison
        );
        
        // Store for pattern detection
        this.trackDivergencePattern(traditionalResult.file.id, divergenceAnalysis);
        
        // Generate alert with explanation
        this.generateDivergenceAlert(traditionalResult.file, divergenceAnalysis);
      }
      
      // Record metrics with explanations
      this.metrics.record({
        fileId: traditionalResult.file.id,
        duration: performance.now() - startTime,
        divergence: comparison.divergence,
        agreement: comparison.agreement,
        explanationQuality: comparison.explanationQuality,
        timestamp: Date.now()
      });
      
      // Store comparison for reporting
      this.storeComparison(traditionalResult.file.id, comparison);
      
    } catch (error) {
      console.error('Explainable shadow analysis error:', error);
      this.metrics.recordError(error);
    }
  }
  
  /**
   * Compare results with detailed explanations
   */
  async compareWithExplanations(traditional, ml) {
    // Basic comparison from parent
    const basicComparison = this.comparator.compare(traditional, ml);
    
    // Enhanced comparison with explanations
    const enhancedComparison = {
      ...basicComparison,
      explanations: {
        traditional: this.extractTraditionalReasoning(traditional),
        ml: this.extractMLExplanations(ml),
        differences: await this.explainDifferences(traditional, ml)
      },
      decisionPaths: this.compareDecisionPaths(traditional, ml),
      featureImportance: this.compareFeatureImportance(traditional, ml),
      confidenceBreakdown: this.compareConfidenceBreakdown(traditional, ml)
    };
    
    // Calculate explanation quality score
    enhancedComparison.explanationQuality = this.assessExplanationQuality(
      enhancedComparison.explanations
    );
    
    return enhancedComparison;
  }
  
  /**
   * Analyze divergence with root cause analysis
   */
  async analyzeDivergence(traditional, ml, comparison) {
    const analysis = {
      severity: this.categorizeSeverity(comparison.divergence),
      rootCauses: await this.identifyRootCauses(traditional, ml, comparison),
      impactedFeatures: this.identifyImpactedFeatures(comparison),
      recommendations: this.generateRecommendations(comparison),
      visualization: await this.createDivergenceVisualization(comparison)
    };
    
    // Deep dive into specific divergence types
    if (comparison.divergence > 0.3) {
      analysis.deepAnalysis = await this.performDeepAnalysis(traditional, ml);
    }
    
    return analysis;
  }
  
  /**
   * Extract traditional analysis reasoning
   */
  extractTraditionalReasoning(result) {
    const reasoning = {
      method: 'keyword-based',
      factors: [],
      logic: 'rule-based'
    };
    
    // Extract keyword matches
    if (result.keywordMatches) {
      reasoning.factors = result.keywordMatches.map(kw => ({
        type: 'keyword',
        value: kw,
        contribution: 'positive'
      }));
    }
    
    // Extract analysis type reasoning
    if (result.analysisType) {
      reasoning.primaryFactor = result.analysisType;
      reasoning.confidence = result.relevanceScore / 100;
    }
    
    // Generate explanation
    reasoning.explanation = this.generateTraditionalExplanation(result);
    
    return reasoning;
  }
  
  /**
   * Extract ML explanations
   */
  extractMLExplanations(result) {
    if (!result.explanations) {
      return {
        method: 'ml-based',
        factors: [],
        explanation: 'No explanations available'
      };
    }
    
    const mlExplanation = {
      method: 'multi-dimensional ML',
      factors: [],
      logic: 'learned patterns'
    };
    
    // Extract SHAP factors
    if (result.explanations.shap?.keyContributors) {
      mlExplanation.factors.push(
        ...result.explanations.shap.keyContributors.map(c => ({
          type: 'shap',
          feature: c.feature,
          contribution: c.impact,
          direction: c.impact > 0 ? 'positive' : 'negative'
        }))
      );
    }
    
    // Extract natural language explanation
    if (result.explanations.naturalLanguage?.narrative) {
      mlExplanation.explanation = result.explanations.naturalLanguage.narrative;
    }
    
    // Add attention focus
    if (result.explanations.attention?.focusAreas) {
      mlExplanation.focusAreas = result.explanations.attention.focusAreas;
    }
    
    return mlExplanation;
  }
  
  /**
   * Explain differences between approaches
   */
  async explainDifferences(traditional, ml) {
    const differences = {
      methodological: this.explainMethodDifferences(traditional, ml),
      factorDifferences: this.explainFactorDifferences(traditional, ml),
      confidenceDifferences: this.explainConfidenceDifferences(traditional, ml),
      recommendation: this.synthesizeRecommendation(traditional, ml)
    };
    
    // Generate natural language explanation of differences
    differences.narrative = await this.generateDifferenceNarrative(differences);
    
    return differences;
  }
  
  /**
   * Compare decision paths
   */
  compareDecisionPaths(traditional, ml) {
    const paths = {
      traditional: this.reconstructTraditionalPath(traditional),
      ml: ml.decisionPath || [],
      divergencePoint: null,
      similarity: 0
    };
    
    // Find where paths diverge
    if (paths.traditional.length > 0 && paths.ml.length > 0) {
      for (let i = 0; i < Math.min(paths.traditional.length, paths.ml.length); i++) {
        if (!this.pathNodesEqual(paths.traditional[i], paths.ml[i])) {
          paths.divergencePoint = i;
          break;
        }
      }
    }
    
    // Calculate path similarity
    paths.similarity = this.calculatePathSimilarity(paths.traditional, paths.ml);
    
    return paths;
  }
  
  /**
   * Compare feature importance
   */
  compareFeatureImportance(traditional, ml) {
    const comparison = {
      traditional: this.extractTraditionalFeatures(traditional),
      ml: this.extractMLFeatures(ml),
      agreement: 0,
      discrepancies: []
    };
    
    // Find feature agreement
    const commonFeatures = new Set([
      ...comparison.traditional.map(f => f.name),
      ...comparison.ml.map(f => f.name)
    ]);
    
    for (const feature of commonFeatures) {
      const tradImportance = comparison.traditional.find(f => f.name === feature)?.importance || 0;
      const mlImportance = comparison.ml.find(f => f.name === feature)?.importance || 0;
      
      const difference = Math.abs(tradImportance - mlImportance);
      if (difference > 0.2) {
        comparison.discrepancies.push({
          feature,
          traditional: tradImportance,
          ml: mlImportance,
          difference
        });
      }
    }
    
    // Calculate overall agreement
    comparison.agreement = 1 - (comparison.discrepancies.length / commonFeatures.size);
    
    return comparison;
  }
  
  /**
   * Compare confidence breakdown
   */
  compareConfidenceBreakdown(traditional, ml) {
    const breakdown = {
      traditional: {
        overall: traditional.relevanceScore / 100,
        factors: this.getTraditionalConfidenceFactors(traditional)
      },
      ml: {
        overall: ml.overall,
        dimensions: ml.dimensions,
        factors: this.getMLConfidenceFactors(ml)
      },
      correlation: 0
    };
    
    // Calculate correlation between confidence factors
    breakdown.correlation = this.calculateConfidenceCorrelation(
      breakdown.traditional,
      breakdown.ml
    );
    
    return breakdown;
  }
  
  /**
   * Identify root causes of divergence
   */
  async identifyRootCauses(traditional, ml, comparison) {
    const rootCauses = [];
    
    // Method differences
    if (comparison.explanations.methodological.significantDifference) {
      rootCauses.push({
        type: 'methodological',
        description: 'Different analysis approaches',
        impact: 'high',
        details: comparison.explanations.methodological
      });
    }
    
    // Feature importance misalignment
    if (comparison.featureImportance.agreement < 0.5) {
      rootCauses.push({
        type: 'feature_misalignment',
        description: 'Different feature prioritization',
        impact: 'medium',
        details: comparison.featureImportance.discrepancies
      });
    }
    
    // Data interpretation differences
    const interpretationDiff = await this.analyzeInterpretationDifferences(
      traditional,
      ml
    );
    if (interpretationDiff.significant) {
      rootCauses.push({
        type: 'interpretation',
        description: 'Different data interpretation',
        impact: interpretationDiff.impact,
        details: interpretationDiff
      });
    }
    
    // Model uncertainty
    if (ml.explanations?.uncertainty && ml.explanations.uncertainty > 0.3) {
      rootCauses.push({
        type: 'uncertainty',
        description: 'High model uncertainty',
        impact: 'medium',
        details: { uncertainty: ml.explanations.uncertainty }
      });
    }
    
    return rootCauses;
  }
  
  /**
   * Generate divergence alert
   */
  generateDivergenceAlert(file, analysis) {
    const alert = {
      fileId: file.id,
      fileName: file.name,
      severity: analysis.severity,
      summary: this.generateAlertSummary(analysis),
      rootCauses: analysis.rootCauses.map(rc => rc.description),
      recommendations: analysis.recommendations,
      timestamp: Date.now()
    };
    
    // Emit alert event
    KC.EventBus.emit('shadow:divergence:alert', alert);
    
    // Log for debugging
    console.warn('Shadow Mode Divergence Alert:', alert);
    
    // Store for pattern analysis
    this.storeAlert(alert);
  }
  
  /**
   * Track divergence patterns
   */
  trackDivergencePattern(fileId, analysis) {
    // Extract pattern features
    const pattern = {
      rootCauseTypes: analysis.rootCauses.map(rc => rc.type),
      severity: analysis.severity,
      featureTypes: analysis.impactedFeatures.map(f => f.type),
      timestamp: Date.now()
    };
    
    // Store pattern
    if (!this.divergencePatterns.has(fileId)) {
      this.divergencePatterns.set(fileId, []);
    }
    this.divergencePatterns.get(fileId).push(pattern);
    
    // Analyze for recurring patterns
    if (this.divergencePatterns.size > 10) {
      this.analyzePatternTrends();
    }
  }
  
  /**
   * Get enhanced shadow mode report
   */
  async getExplainableReport() {
    const baseReport = await this.getReport();
    
    // Enhance with explainability metrics
    const enhancedReport = {
      ...baseReport,
      explanations: {
        comparisonCount: this.comparisons.size,
        averageExplanationQuality: this.calculateAverageExplanationQuality(),
        divergencePatterns: this.summarizeDivergencePatterns(),
        rootCauseAnalysis: this.summarizeRootCauses()
      },
      transparency: await this.transparencyReporter.generateReport(
        this.comparisons,
        this.divergencePatterns
      ),
      recommendations: this.generateSystemRecommendations()
    };
    
    return enhancedReport;
  }
  
  /**
   * Helper methods
   */
  
  categorizeSeverity(divergence) {
    if (divergence < 0.1) return 'low';
    if (divergence < 0.3) return 'medium';
    if (divergence < 0.5) return 'high';
    return 'critical';
  }
  
  generateTraditionalExplanation(result) {
    const factors = [];
    
    if (result.relevanceScore > 70) {
      factors.push('high keyword relevance');
    }
    
    if (result.categories?.length > 0) {
      factors.push(`categorized as ${result.categories.join(', ')}`);
    }
    
    if (result.analysisType) {
      factors.push(`identified as ${result.analysisType}`);
    }
    
    return `Traditional analysis indicates ${factors.join(', ')}`;
  }
  
  explainMethodDifferences(traditional, ml) {
    return {
      traditional: 'Rule-based keyword matching and heuristics',
      ml: 'Multi-dimensional pattern recognition with learned weights',
      significantDifference: true,
      impact: 'Different methods may prioritize different aspects'
    };
  }
  
  explainFactorDifferences(traditional, ml) {
    const tradFactors = this.extractTraditionalFeatures(traditional);
    const mlFactors = this.extractMLFeatures(ml);
    
    const differences = {
      onlyInTraditional: tradFactors.filter(tf => 
        !mlFactors.find(mf => mf.name === tf.name)
      ),
      onlyInML: mlFactors.filter(mf => 
        !tradFactors.find(tf => tf.name === mf.name)
      ),
      differentImportance: []
    };
    
    // Find factors with different importance
    for (const tf of tradFactors) {
      const mf = mlFactors.find(mf => mf.name === tf.name);
      if (mf && Math.abs(tf.importance - mf.importance) > 0.2) {
        differences.differentImportance.push({
          factor: tf.name,
          traditional: tf.importance,
          ml: mf.importance
        });
      }
    }
    
    return differences;
  }
  
  explainConfidenceDifferences(traditional, ml) {
    const tradConfidence = traditional.relevanceScore / 100;
    const mlConfidence = ml.overall;
    const difference = mlConfidence - tradConfidence;
    
    let explanation = '';
    
    if (Math.abs(difference) < 0.1) {
      explanation = 'Both methods arrive at similar confidence levels';
    } else if (difference > 0) {
      explanation = `ML model has ${(difference * 100).toFixed(0)}% higher confidence, ` +
                   `likely due to detecting patterns not captured by keywords`;
    } else {
      explanation = `Traditional analysis has ${(Math.abs(difference) * 100).toFixed(0)}% higher confidence, ` +
                   `possibly due to specific keyword matches ML doesn't prioritize`;
    }
    
    return {
      traditional: tradConfidence,
      ml: mlConfidence,
      difference,
      explanation
    };
  }
  
  synthesizeRecommendation(traditional, ml) {
    const recommendations = [];
    
    // Based on confidence difference
    const confDiff = Math.abs((ml.overall) - (traditional.relevanceScore / 100));
    if (confDiff > 0.3) {
      recommendations.push('Review both analyses carefully due to significant disagreement');
    }
    
    // Based on method strengths
    if (traditional.keywordMatches?.length > 5 && ml.overall < 0.5) {
      recommendations.push('Traditional analysis may be more reliable for keyword-heavy content');
    }
    
    if (ml.explanations?.shap && ml.overall > 0.8) {
      recommendations.push('ML analysis provides deeper insights into contributing factors');
    }
    
    return recommendations;
  }
  
  async generateDifferenceNarrative(differences) {
    const parts = [];
    
    // Method differences
    parts.push('The traditional approach uses ' + differences.methodological.traditional + 
               ' while the ML model employs ' + differences.methodological.ml + '.');
    
    // Factor differences
    if (differences.factorDifferences.differentImportance.length > 0) {
      const topDiff = differences.factorDifferences.differentImportance[0];
      parts.push(`They disagree most on the importance of ${topDiff.factor}.`);
    }
    
    // Confidence explanation
    parts.push(differences.confidenceDifferences.explanation);
    
    // Recommendations
    if (differences.recommendation.length > 0) {
      parts.push('Recommendation: ' + differences.recommendation[0]);
    }
    
    return parts.join(' ');
  }
  
  reconstructTraditionalPath(result) {
    // Reconstruct decision path for traditional analysis
    const path = [];
    
    path.push({
      type: 'input',
      description: 'Receive file for analysis'
    });
    
    path.push({
      type: 'keyword_extraction',
      description: 'Extract and match keywords'
    });
    
    if (result.categories?.length > 0) {
      path.push({
        type: 'categorization',
        description: 'Apply categories'
      });
    }
    
    path.push({
      type: 'scoring',
      description: 'Calculate relevance score'
    });
    
    path.push({
      type: 'classification',
      description: `Classify as ${result.analysisType || 'general'}`
    });
    
    return path;
  }
  
  pathNodesEqual(node1, node2) {
    return node1.type === node2.type;
  }
  
  calculatePathSimilarity(path1, path2) {
    if (path1.length === 0 || path2.length === 0) return 0;
    
    const set1 = new Set(path1.map(n => n.type));
    const set2 = new Set(path2.map(n => n.type));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  extractTraditionalFeatures(result) {
    const features = [];
    
    if (result.relevanceScore !== undefined) {
      features.push({
        name: 'keyword_relevance',
        importance: result.relevanceScore / 100
      });
    }
    
    if (result.categories?.length > 0) {
      features.push({
        name: 'has_categories',
        importance: 0.3
      });
    }
    
    return features;
  }
  
  extractMLFeatures(result) {
    const features = [];
    
    if (result.explanations?.shap?.importance) {
      features.push(...result.explanations.shap.importance.map(f => ({
        name: f.feature,
        importance: Math.abs(f.impact)
      })));
    }
    
    return features;
  }
  
  getTraditionalConfidenceFactors(result) {
    return {
      keywords: result.relevanceScore / 100,
      structure: 0.5, // Default assumption
      recency: result.isRecent ? 0.8 : 0.3
    };
  }
  
  getMLConfidenceFactors(result) {
    const factors = {};
    
    if (result.dimensions) {
      for (const [dim, value] of Object.entries(result.dimensions)) {
        factors[dim] = value;
      }
    }
    
    return factors;
  }
  
  calculateConfidenceCorrelation(traditional, ml) {
    // Simple correlation between confidence factors
    const commonFactors = [];
    
    if (traditional.factors.keywords && ml.factors.semantic) {
      commonFactors.push([traditional.factors.keywords, ml.factors.semantic]);
    }
    
    if (commonFactors.length === 0) return 0;
    
    // Calculate Pearson correlation
    return this.pearsonCorrelation(
      commonFactors.map(cf => cf[0]),
      commonFactors.map(cf => cf[1])
    );
  }
  
  pearsonCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  async analyzeInterpretationDifferences(traditional, ml) {
    // Analyze how each method interprets the data
    return {
      significant: true,
      impact: 'medium',
      details: {
        traditional: 'Literal keyword matching',
        ml: 'Contextual pattern recognition'
      }
    };
  }
  
  identifyImpactedFeatures(comparison) {
    const impacted = [];
    
    if (comparison.featureImportance?.discrepancies) {
      impacted.push(...comparison.featureImportance.discrepancies.map(d => ({
        name: d.feature,
        type: 'importance_mismatch',
        severity: d.difference > 0.5 ? 'high' : 'medium'
      })));
    }
    
    return impacted;
  }
  
  generateRecommendations(comparison) {
    const recommendations = [];
    
    // Based on divergence level
    if (comparison.divergence > 0.5) {
      recommendations.push({
        priority: 'high',
        action: 'Manual review recommended',
        reason: 'High divergence between methods'
      });
    }
    
    // Based on explanation quality
    if (comparison.explanationQuality < 0.5) {
      recommendations.push({
        priority: 'medium',
        action: 'Improve ML model explanations',
        reason: 'Low explanation quality'
      });
    }
    
    // Based on feature agreement
    if (comparison.featureImportance?.agreement < 0.3) {
      recommendations.push({
        priority: 'medium',
        action: 'Review feature engineering',
        reason: 'Poor feature agreement between methods'
      });
    }
    
    return recommendations;
  }
  
  async createDivergenceVisualization(comparison) {
    return {
      type: 'divergence_analysis',
      charts: {
        confidence: this.createConfidenceComparisonChart(comparison),
        features: this.createFeatureComparisonChart(comparison),
        decisionPath: this.createPathComparisonDiagram(comparison)
      }
    };
  }
  
  assessExplanationQuality(explanations) {
    let quality = 0;
    let factors = 0;
    
    // Traditional explanation quality
    if (explanations.traditional.explanation) {
      quality += explanations.traditional.explanation.length > 50 ? 0.5 : 0.3;
      factors++;
    }
    
    // ML explanation quality
    if (explanations.ml.explanation) {
      quality += explanations.ml.explanation.length > 100 ? 1 : 0.5;
      factors++;
    }
    
    // Difference explanation quality
    if (explanations.differences.narrative) {
      quality += 0.5;
      factors++;
    }
    
    return factors > 0 ? quality / factors : 0;
  }
  
  generateAlertSummary(analysis) {
    const causes = analysis.rootCauses.map(rc => rc.description).join(', ');
    return `${analysis.severity} severity divergence detected. Root causes: ${causes}`;
  }
  
  storeComparison(fileId, comparison) {
    this.comparisons.set(fileId, {
      ...comparison,
      timestamp: Date.now()
    });
    
    // Limit storage size
    if (this.comparisons.size > 1000) {
      const oldestKey = this.comparisons.keys().next().value;
      this.comparisons.delete(oldestKey);
    }
  }
  
  storeAlert(alert) {
    // Store alert for pattern analysis
    if (!this.alerts) {
      this.alerts = [];
    }
    
    this.alerts.push(alert);
    
    // Keep last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }
  
  analyzePatternTrends() {
    // Analyze divergence patterns for trends
    const trends = {
      commonRootCauses: new Map(),
      severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
    };
    
    for (const patterns of this.divergencePatterns.values()) {
      for (const pattern of patterns) {
        // Count root cause types
        for (const causeType of pattern.rootCauseTypes) {
          const count = trends.commonRootCauses.get(causeType) || 0;
          trends.commonRootCauses.set(causeType, count + 1);
        }
        
        // Count severity
        trends.severityDistribution[pattern.severity]++;
      }
    }
    
    // Emit trends for monitoring
    KC.EventBus.emit('shadow:pattern:trends', trends);
  }
  
  calculateAverageExplanationQuality() {
    if (this.comparisons.size === 0) return 0;
    
    let totalQuality = 0;
    for (const comparison of this.comparisons.values()) {
      totalQuality += comparison.explanationQuality || 0;
    }
    
    return totalQuality / this.comparisons.size;
  }
  
  summarizeDivergencePatterns() {
    const summary = {
      totalPatterns: 0,
      commonCauses: [],
      severityBreakdown: {}
    };
    
    // Aggregate patterns
    const causeCount = new Map();
    
    for (const patterns of this.divergencePatterns.values()) {
      summary.totalPatterns += patterns.length;
      
      for (const pattern of patterns) {
        for (const cause of pattern.rootCauseTypes) {
          causeCount.set(cause, (causeCount.get(cause) || 0) + 1);
        }
      }
    }
    
    // Find most common causes
    summary.commonCauses = Array.from(causeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cause, count]) => ({ cause, count }));
    
    return summary;
  }
  
  summarizeRootCauses() {
    const rootCauseSummary = new Map();
    
    for (const comparison of this.comparisons.values()) {
      if (comparison.rootCauses) {
        for (const cause of comparison.rootCauses) {
          const key = cause.type;
          if (!rootCauseSummary.has(key)) {
            rootCauseSummary.set(key, {
              count: 0,
              avgImpact: 0,
              descriptions: new Set()
            });
          }
          
          const summary = rootCauseSummary.get(key);
          summary.count++;
          summary.descriptions.add(cause.description);
        }
      }
    }
    
    return Array.from(rootCauseSummary.entries()).map(([type, summary]) => ({
      type,
      count: summary.count,
      descriptions: Array.from(summary.descriptions)
    }));
  }
  
  generateSystemRecommendations() {
    const recommendations = [];
    
    // Based on average divergence
    const avgDivergence = this.metrics.getSummary().avgDivergence;
    if (avgDivergence > 0.2) {
      recommendations.push({
        area: 'model_alignment',
        priority: 'high',
        suggestion: 'Consider retraining ML model to better align with traditional analysis'
      });
    }
    
    // Based on explanation quality
    const avgQuality = this.calculateAverageExplanationQuality();
    if (avgQuality < 0.6) {
      recommendations.push({
        area: 'explainability',
        priority: 'medium',
        suggestion: 'Enhance ML model explainability features'
      });
    }
    
    // Based on pattern analysis
    const patterns = this.summarizeDivergencePatterns();
    if (patterns.commonCauses.some(c => c.cause === 'methodological')) {
      recommendations.push({
        area: 'methodology',
        priority: 'medium',
        suggestion: 'Review and align analysis methodologies'
      });
    }
    
    return recommendations;
  }
  
  createConfidenceComparisonChart(comparison) {
    return {
      type: 'bar',
      data: [
        {
          label: 'Traditional',
          value: comparison.traditional.confidence,
          color: '#2196F3'
        },
        {
          label: 'ML',
          value: comparison.ml.overall,
          color: '#4CAF50'
        }
      ],
      divergence: comparison.divergence
    };
  }
  
  createFeatureComparisonChart(comparison) {
    const features = [];
    
    if (comparison.featureImportance) {
      for (const discrepancy of comparison.featureImportance.discrepancies) {
        features.push({
          feature: discrepancy.feature,
          traditional: discrepancy.traditional,
          ml: discrepancy.ml
        });
      }
    }
    
    return {
      type: 'grouped-bar',
      data: features,
      title: 'Feature Importance Comparison'
    };
  }
  
  createPathComparisonDiagram(comparison) {
    return {
      type: 'parallel-paths',
      traditional: comparison.decisionPaths?.traditional || [],
      ml: comparison.decisionPaths?.ml || [],
      divergencePoint: comparison.decisionPaths?.divergencePoint
    };
  }
}

/**
 * Explanation comparator
 */
class ExplanationComparator {
  compare(explanation1, explanation2) {
    // Compare two explanations for similarity
    return {
      textSimilarity: this.compareText(explanation1, explanation2),
      factorSimilarity: this.compareFactors(explanation1, explanation2),
      structuralSimilarity: this.compareStructure(explanation1, explanation2)
    };
  }
  
  compareText(exp1, exp2) {
    // Simple text similarity
    return 0.5;
  }
  
  compareFactors(exp1, exp2) {
    // Factor comparison
    return 0.6;
  }
  
  compareStructure(exp1, exp2) {
    // Structural comparison
    return 0.7;
  }
}

/**
 * Divergence analyzer
 */
class DivergenceAnalyzer {
  analyze(divergence) {
    return {
      severity: this.categorizeSeverity(divergence),
      patterns: this.identifyPatterns(divergence),
      recommendations: this.generateRecommendations(divergence)
    };
  }
  
  categorizeSeverity(divergence) {
    if (divergence < 0.1) return 'low';
    if (divergence < 0.3) return 'medium';
    return 'high';
  }
  
  identifyPatterns(divergence) {
    return [];
  }
  
  generateRecommendations(divergence) {
    return [];
  }
}

/**
 * Transparency reporter
 */
class TransparencyReporter {
  async generateReport(comparisons, patterns) {
    return {
      summary: 'Transparency report generated',
      comparisons: comparisons.size,
      patterns: patterns.size,
      insights: []
    };
  }
}

export default ExplainableShadowController;
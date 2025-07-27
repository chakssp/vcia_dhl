/**
 * ExplainableConfidenceTracker.js
 * 
 * Enhanced confidence tracker with explainability features.
 * Tracks not just confidence evolution but also explanations over time.
 */

import { ConfidenceTracker } from '../../../core/ConfidenceTracker.js';
import { ExplanationEvolutionAnalyzer } from '../explainability/ExplanationEvolutionAnalyzer.js';
import { FeatureImportanceTracker } from '../explainability/FeatureImportanceTracker.js';

export class ExplainableConfidenceTracker extends ConfidenceTracker {
  constructor(options = {}) {
    super(options);
    
    // Explainability components
    this.explanationEvolution = new ExplanationEvolutionAnalyzer();
    this.featureImportanceTracker = new FeatureImportanceTracker();
    
    // Enhanced tracking configuration
    this.config = {
      ...this.config,
      trackExplanations: options.trackExplanations !== false,
      trackFeatureImportance: options.trackFeatureImportance !== false,
      explanationDepth: options.explanationDepth || 'full', // minimal, standard, full
      compareIterations: options.compareIterations !== false,
      visualizeEvolution: options.visualizeEvolution !== false
    };
    
    // Explanation history storage
    this.explanationHistory = new Map();
    
    // Feature importance evolution
    this.featureEvolution = new Map();
    
    // Decision rationale tracking
    this.decisionRationales = new Map();
  }
  
  /**
   * Track confidence with explanations
   */
  async track(data) {
    // Track base confidence
    await super.track(data);
    
    // Track explanations if available
    if (this.config.trackExplanations && data.explanations) {
      await this.trackExplanations(data);
    }
    
    // Track feature importance evolution
    if (this.config.trackFeatureImportance && data.explanations?.shap) {
      await this.trackFeatureImportance(data);
    }
    
    // Analyze explanation evolution
    if (data.fileId && this.hasMultipleIterations(data.fileId)) {
      const evolution = await this.analyzeEvolution(data.fileId);
      
      // Emit evolution insights
      KC.EventBus.emit('ml:explanation:evolution', {
        fileId: data.fileId,
        evolution,
        insights: this.generateEvolutionInsights(evolution)
      });
    }
  }
  
  /**
   * Track explanations over iterations
   */
  async trackExplanations(data) {
    const { fileId, explanations, timestamp } = data;
    
    // Get or create explanation history
    if (!this.explanationHistory.has(fileId)) {
      this.explanationHistory.set(fileId, []);
    }
    
    const history = this.explanationHistory.get(fileId);
    
    // Create explanation entry
    const entry = {
      iteration: history.length + 1,
      timestamp,
      explanations: this.compressExplanations(explanations),
      keyFactors: this.extractKeyFactors(explanations),
      naturalLanguage: explanations.naturalLanguage?.narrative,
      confidence: data.overall
    };
    
    // Compare with previous iteration
    if (history.length > 0) {
      const previous = history[history.length - 1];
      entry.changes = this.compareExplanations(previous, entry);
    }
    
    history.push(entry);
    
    // Persist to database
    await this.db.saveExplanationHistory(fileId, history);
  }
  
  /**
   * Track feature importance evolution
   */
  async trackFeatureImportance(data) {
    const { fileId, explanations, timestamp } = data;
    
    if (!explanations.shap?.importance) return;
    
    // Get or create feature evolution
    if (!this.featureEvolution.has(fileId)) {
      this.featureEvolution.set(fileId, new Map());
    }
    
    const featureMap = this.featureEvolution.get(fileId);
    
    // Track each feature's importance over time
    for (const feature of explanations.shap.importance) {
      if (!featureMap.has(feature.feature)) {
        featureMap.set(feature.feature, []);
      }
      
      featureMap.get(feature.feature).push({
        iteration: this.getIterationCount(fileId),
        impact: feature.impact,
        direction: feature.direction,
        timestamp
      });
    }
    
    // Analyze feature stability
    const stability = this.featureImportanceTracker.analyzeStability(featureMap);
    
    if (stability.hasSignificantChanges) {
      KC.EventBus.emit('ml:feature:instability', {
        fileId,
        unstableFeatures: stability.unstableFeatures,
        recommendation: 'Consider investigating unstable features'
      });
    }
  }
  
  /**
   * Analyze explanation evolution
   */
  async analyzeEvolution(fileId) {
    const history = this.explanationHistory.get(fileId) || [];
    const confidenceHistory = this.history.get(fileId) || [];
    
    const evolution = {
      explanationConsistency: this.analyzeExplanationConsistency(history),
      featureDrift: await this.analyzeFeatureDrift(fileId),
      convergenceCorrelation: this.analyzeConvergenceCorrelation(
        confidenceHistory,
        history
      ),
      rationaleTrends: this.analyzeRationaleTrends(history),
      visualizations: this.config.visualizeEvolution ? 
        await this.createEvolutionVisualizations(fileId) : null
    };
    
    return evolution;
  }
  
  /**
   * Get comprehensive tracking report
   */
  async getExplainableReport(fileId) {
    const baseReport = await this.getHistory(fileId);
    
    if (!this.config.trackExplanations) {
      return baseReport;
    }
    
    const explanationHistory = this.explanationHistory.get(fileId) || [];
    const featureEvolution = this.featureEvolution.get(fileId);
    
    const report = {
      ...baseReport,
      explanations: {
        history: explanationHistory,
        currentExplanation: explanationHistory[explanationHistory.length - 1],
        evolution: await this.analyzeEvolution(fileId),
        featureImportance: featureEvolution ? 
          this.summarizeFeatureImportance(featureEvolution) : null,
        insights: this.generateInsights(fileId, baseReport, explanationHistory)
      },
      visualizations: await this.generateReportVisualizations(fileId)
    };
    
    return report;
  }
  
  /**
   * Compare explanations across files
   */
  async compareFiles(fileIds) {
    const comparisons = {
      confidence: [],
      explanations: [],
      features: [],
      convergence: []
    };
    
    for (const fileId of fileIds) {
      const history = await this.getHistory(fileId);
      const explanations = this.explanationHistory.get(fileId);
      
      comparisons.confidence.push({
        fileId,
        current: history[history.length - 1]?.overall,
        iterations: history.length,
        converged: history[history.length - 1]?.convergence?.converged
      });
      
      if (explanations) {
        comparisons.explanations.push({
          fileId,
          consistency: this.analyzeExplanationConsistency(explanations).score,
          topFactors: explanations[explanations.length - 1]?.keyFactors
        });
      }
    }
    
    // Analyze similarities and differences
    comparisons.analysis = this.analyzeComparisons(comparisons);
    
    return comparisons;
  }
  
  /**
   * Helper methods
   */
  
  compressExplanations(explanations) {
    // Compress explanations to save storage
    const compressed = {};
    
    if (explanations.shap) {
      compressed.shap = {
        topFeatures: explanations.shap.keyContributors?.slice(0, 5),
        summary: explanations.shap.summary
      };
    }
    
    if (explanations.lime) {
      compressed.lime = {
        topRules: explanations.lime.rules?.slice(0, 3),
        summary: explanations.lime.summary
      };
    }
    
    if (explanations.attention) {
      compressed.attention = {
        focusAreas: explanations.attention.focusAreas?.slice(0, 3),
        entropy: explanations.attention.entropy
      };
    }
    
    if (explanations.counterfactuals) {
      compressed.counterfactuals = {
        count: explanations.counterfactuals.scenarios?.length,
        topRecommendation: explanations.counterfactuals.recommendations?.[0]
      };
    }
    
    return compressed;
  }
  
  extractKeyFactors(explanations) {
    const factors = [];
    
    // Extract from SHAP
    if (explanations.shap?.keyContributors) {
      factors.push(...explanations.shap.keyContributors.slice(0, 3).map(c => ({
        source: 'shap',
        feature: c.feature,
        impact: c.impact
      })));
    }
    
    // Extract from LIME
    if (explanations.lime?.rules) {
      factors.push(...explanations.lime.rules.slice(0, 2).map(r => ({
        source: 'lime',
        feature: r.feature,
        impact: r.impact
      })));
    }
    
    // Sort by absolute impact
    factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    
    return factors.slice(0, 5);
  }
  
  compareExplanations(previous, current) {
    const changes = {
      factorChanges: this.compareFactors(previous.keyFactors, current.keyFactors),
      confidenceDelta: current.confidence - previous.confidence,
      narrativeChanged: previous.naturalLanguage !== current.naturalLanguage,
      timestamp: current.timestamp
    };
    
    // Calculate explanation stability score
    changes.stabilityScore = this.calculateStabilityScore(changes);
    
    return changes;
  }
  
  compareFactors(previousFactors, currentFactors) {
    const changes = {
      added: [],
      removed: [],
      changed: []
    };
    
    const prevMap = new Map(previousFactors.map(f => [f.feature, f]));
    const currMap = new Map(currentFactors.map(f => [f.feature, f]));
    
    // Find added factors
    for (const [feature, factor] of currMap) {
      if (!prevMap.has(feature)) {
        changes.added.push(factor);
      } else {
        // Check if impact changed significantly
        const prevFactor = prevMap.get(feature);
        if (Math.abs(factor.impact - prevFactor.impact) > 0.05) {
          changes.changed.push({
            feature,
            previousImpact: prevFactor.impact,
            currentImpact: factor.impact,
            delta: factor.impact - prevFactor.impact
          });
        }
      }
    }
    
    // Find removed factors
    for (const [feature, factor] of prevMap) {
      if (!currMap.has(feature)) {
        changes.removed.push(factor);
      }
    }
    
    return changes;
  }
  
  analyzeExplanationConsistency(history) {
    if (history.length < 2) {
      return { score: 1, details: 'Insufficient history' };
    }
    
    let consistencyScore = 0;
    let comparisons = 0;
    
    // Compare consecutive explanations
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      
      // Factor consistency
      const factorOverlap = this.calculateFactorOverlap(
        prev.keyFactors,
        curr.keyFactors
      );
      
      consistencyScore += factorOverlap;
      comparisons++;
    }
    
    return {
      score: comparisons > 0 ? consistencyScore / comparisons : 0,
      details: this.categorizeConsistency(consistencyScore / comparisons)
    };
  }
  
  calculateFactorOverlap(factors1, factors2) {
    const features1 = new Set(factors1.map(f => f.feature));
    const features2 = new Set(factors2.map(f => f.feature));
    
    const intersection = new Set([...features1].filter(x => features2.has(x)));
    const union = new Set([...features1, ...features2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  async analyzeFeatureDrift(fileId) {
    const featureMap = this.featureEvolution.get(fileId);
    if (!featureMap) return null;
    
    const drift = {
      features: {},
      overallDrift: 0
    };
    
    for (const [feature, history] of featureMap) {
      if (history.length < 2) continue;
      
      // Calculate drift metrics
      const firstImpact = history[0].impact;
      const lastImpact = history[history.length - 1].impact;
      const maxChange = Math.max(...history.map(h => Math.abs(h.impact))) -
                       Math.min(...history.map(h => Math.abs(h.impact)));
      
      drift.features[feature] = {
        initialImpact: firstImpact,
        currentImpact: lastImpact,
        totalDrift: Math.abs(lastImpact - firstImpact),
        maxChange,
        volatility: this.calculateVolatility(history.map(h => h.impact))
      };
      
      drift.overallDrift += Math.abs(lastImpact - firstImpact);
    }
    
    drift.overallDrift /= featureMap.size;
    
    return drift;
  }
  
  analyzeConvergenceCorrelation(confidenceHistory, explanationHistory) {
    if (confidenceHistory.length < 3 || explanationHistory.length < 3) {
      return { correlation: 0, analysis: 'Insufficient data' };
    }
    
    // Extract stability scores over time
    const confidenceDeltas = [];
    const explanationStability = [];
    
    for (let i = 1; i < Math.min(confidenceHistory.length, explanationHistory.length); i++) {
      confidenceDeltas.push(Math.abs(confidenceHistory[i].delta));
      
      if (explanationHistory[i].changes) {
        explanationStability.push(explanationHistory[i].changes.stabilityScore);
      }
    }
    
    // Calculate correlation
    const correlation = this.pearsonCorrelation(confidenceDeltas, explanationStability);
    
    return {
      correlation,
      analysis: this.interpretCorrelation(correlation),
      recommendation: this.getCorrelationRecommendation(correlation)
    };
  }
  
  analyzeRationaleTrends(history) {
    const trends = {
      topicEvolution: [],
      sentimentTrend: [],
      complexityTrend: []
    };
    
    for (const entry of history) {
      if (entry.naturalLanguage) {
        // Analyze natural language explanations
        trends.topicEvolution.push(this.extractTopics(entry.naturalLanguage));
        trends.sentimentTrend.push(this.analyzeSentiment(entry.naturalLanguage));
        trends.complexityTrend.push(this.calculateComplexity(entry.naturalLanguage));
      }
    }
    
    return {
      trends,
      insights: this.generateTrendInsights(trends)
    };
  }
  
  async createEvolutionVisualizations(fileId) {
    const visualizations = {
      confidenceTimeline: await this.createConfidenceTimeline(fileId),
      featureImportanceFlow: await this.createFeatureImportanceFlow(fileId),
      explanationStability: await this.createExplanationStabilityChart(fileId),
      convergenceCorrelation: await this.createConvergenceCorrelationPlot(fileId)
    };
    
    return visualizations;
  }
  
  generateEvolutionInsights(evolution) {
    const insights = [];
    
    // Consistency insights
    if (evolution.explanationConsistency.score < 0.5) {
      insights.push({
        type: 'warning',
        message: 'Explanations are inconsistent across iterations',
        recommendation: 'Consider investigating model stability'
      });
    }
    
    // Feature drift insights
    if (evolution.featureDrift?.overallDrift > 0.3) {
      insights.push({
        type: 'info',
        message: 'Significant feature importance drift detected',
        recommendation: 'Review feature engineering and data quality'
      });
    }
    
    // Convergence correlation insights
    if (evolution.convergenceCorrelation?.correlation < -0.5) {
      insights.push({
        type: 'success',
        message: 'Explanations stabilize as confidence converges',
        recommendation: 'Model behavior is as expected'
      });
    }
    
    return insights;
  }
  
  hasMultipleIterations(fileId) {
    const history = this.history.get(fileId);
    return history && history.length > 1;
  }
  
  getIterationCount(fileId) {
    const history = this.history.get(fileId);
    return history ? history.length : 0;
  }
  
  calculateStabilityScore(changes) {
    let score = 1.0;
    
    // Penalize factor changes
    score -= changes.factorChanges.added.length * 0.1;
    score -= changes.factorChanges.removed.length * 0.1;
    score -= changes.factorChanges.changed.length * 0.05;
    
    // Penalize narrative changes
    if (changes.narrativeChanged) {
      score -= 0.2;
    }
    
    return Math.max(0, score);
  }
  
  categorizeConsistency(score) {
    if (score > 0.8) return 'Highly consistent';
    if (score > 0.6) return 'Moderately consistent';
    if (score > 0.4) return 'Somewhat inconsistent';
    return 'Highly inconsistent';
  }
  
  calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    let sumChanges = 0;
    for (let i = 1; i < values.length; i++) {
      sumChanges += Math.abs(values[i] - values[i - 1]);
    }
    
    return sumChanges / (values.length - 1);
  }
  
  pearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  interpretCorrelation(correlation) {
    if (correlation > 0.7) return 'Strong positive correlation';
    if (correlation > 0.3) return 'Moderate positive correlation';
    if (correlation > -0.3) return 'Weak or no correlation';
    if (correlation > -0.7) return 'Moderate negative correlation';
    return 'Strong negative correlation';
  }
  
  getCorrelationRecommendation(correlation) {
    if (correlation < -0.5) {
      return 'Good: Explanations stabilize as model converges';
    } else if (correlation > 0.5) {
      return 'Concerning: Explanations remain unstable even as confidence stabilizes';
    }
    return 'Monitor: No clear relationship between convergence and explanation stability';
  }
  
  extractTopics(text) {
    // Simplified topic extraction
    const keywords = ['confidence', 'feature', 'category', 'quality', 'relevance'];
    const found = keywords.filter(kw => text.toLowerCase().includes(kw));
    return found;
  }
  
  analyzeSentiment(text) {
    // Simplified sentiment analysis
    const positive = ['good', 'high', 'excellent', 'strong'];
    const negative = ['low', 'poor', 'weak', 'insufficient'];
    
    let score = 0;
    const lowerText = text.toLowerCase();
    
    positive.forEach(word => {
      if (lowerText.includes(word)) score++;
    });
    
    negative.forEach(word => {
      if (lowerText.includes(word)) score--;
    });
    
    return score;
  }
  
  calculateComplexity(text) {
    // Simple complexity measure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const lexicalDiversity = uniqueWords / words.length;
    
    return avgWordsPerSentence * 0.5 + lexicalDiversity * 50;
  }
  
  generateTrendInsights(trends) {
    const insights = [];
    
    // Topic consistency
    const topicConsistency = this.analyzeTopicConsistency(trends.topicEvolution);
    if (topicConsistency < 0.5) {
      insights.push('Explanation focus shifts significantly over iterations');
    }
    
    // Sentiment trend
    if (trends.sentimentTrend.length > 2) {
      const sentimentDirection = trends.sentimentTrend[trends.sentimentTrend.length - 1] - 
                                trends.sentimentTrend[0];
      if (sentimentDirection > 0) {
        insights.push('Explanations become more positive over time');
      } else if (sentimentDirection < 0) {
        insights.push('Explanations become more cautious over time');
      }
    }
    
    return insights;
  }
  
  analyzeTopicConsistency(topicEvolution) {
    if (topicEvolution.length < 2) return 1;
    
    let consistency = 0;
    for (let i = 1; i < topicEvolution.length; i++) {
      const overlap = this.calculateTopicOverlap(
        topicEvolution[i - 1],
        topicEvolution[i]
      );
      consistency += overlap;
    }
    
    return consistency / (topicEvolution.length - 1);
  }
  
  calculateTopicOverlap(topics1, topics2) {
    const set1 = new Set(topics1);
    const set2 = new Set(topics2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  summarizeFeatureImportance(featureEvolution) {
    const summary = {
      stableFeatures: [],
      volatileFeatures: [],
      trending: { up: [], down: [] }
    };
    
    for (const [feature, history] of featureEvolution) {
      const volatility = this.calculateVolatility(history.map(h => h.impact));
      const trend = history[history.length - 1].impact - history[0].impact;
      
      if (volatility < 0.1) {
        summary.stableFeatures.push(feature);
      } else if (volatility > 0.3) {
        summary.volatileFeatures.push(feature);
      }
      
      if (trend > 0.1) {
        summary.trending.up.push(feature);
      } else if (trend < -0.1) {
        summary.trending.down.push(feature);
      }
    }
    
    return summary;
  }
  
  generateInsights(fileId, confidenceHistory, explanationHistory) {
    const insights = [];
    
    // Convergence insights
    if (confidenceHistory.length > 0) {
      const latest = confidenceHistory[confidenceHistory.length - 1];
      if (latest.convergence?.converged) {
        insights.push({
          type: 'success',
          message: `Converged after ${latest.convergence.iterations} iterations`,
          confidence: latest.convergence.confidence
        });
      }
    }
    
    // Explanation insights
    if (explanationHistory.length > 0) {
      const consistency = this.analyzeExplanationConsistency(explanationHistory);
      insights.push({
        type: consistency.score > 0.7 ? 'success' : 'warning',
        message: `Explanations are ${consistency.details.toLowerCase()}`,
        score: consistency.score
      });
    }
    
    return insights;
  }
  
  async generateReportVisualizations(fileId) {
    // Generate comprehensive visualizations for the report
    return {
      timeline: await this.createConfidenceTimeline(fileId),
      featureEvolution: await this.createFeatureEvolutionChart(fileId),
      explanationConsistency: await this.createConsistencyRadar(fileId),
      insights: await this.createInsightsDashboard(fileId)
    };
  }
  
  async createConfidenceTimeline(fileId) {
    const history = this.history.get(fileId) || [];
    const explanations = this.explanationHistory.get(fileId) || [];
    
    return {
      type: 'timeline',
      data: history.map((h, i) => ({
        iteration: h.iteration,
        confidence: h.overall,
        converged: h.convergence?.converged,
        hasExplanation: i < explanations.length,
        timestamp: h.timestamp
      })),
      annotations: this.generateTimelineAnnotations(history, explanations)
    };
  }
  
  generateTimelineAnnotations(history, explanations) {
    const annotations = [];
    
    // Mark convergence point
    const convergenceIndex = history.findIndex(h => h.convergence?.converged);
    if (convergenceIndex !== -1) {
      annotations.push({
        iteration: convergenceIndex + 1,
        label: 'Converged',
        type: 'success'
      });
    }
    
    // Mark significant explanation changes
    for (let i = 1; i < explanations.length; i++) {
      if (explanations[i].changes?.stabilityScore < 0.5) {
        annotations.push({
          iteration: i + 1,
          label: 'Explanation shift',
          type: 'warning'
        });
      }
    }
    
    return annotations;
  }
  
  analyzeComparisons(comparisons) {
    return {
      convergenceRate: comparisons.confidence.filter(c => c.converged).length / 
                      comparisons.confidence.length,
      avgIterations: comparisons.confidence.reduce((sum, c) => sum + c.iterations, 0) / 
                    comparisons.confidence.length,
      explanationConsistency: comparisons.explanations.length > 0 ?
        comparisons.explanations.reduce((sum, e) => sum + e.consistency, 0) / 
        comparisons.explanations.length : null,
      commonFactors: this.findCommonFactors(comparisons.explanations)
    };
  }
  
  findCommonFactors(explanations) {
    if (explanations.length < 2) return [];
    
    const factorCounts = new Map();
    
    for (const exp of explanations) {
      if (exp.topFactors) {
        for (const factor of exp.topFactors) {
          const count = factorCounts.get(factor.feature) || 0;
          factorCounts.set(factor.feature, count + 1);
        }
      }
    }
    
    // Find factors present in most files
    const threshold = explanations.length * 0.6;
    const common = [];
    
    for (const [feature, count] of factorCounts) {
      if (count >= threshold) {
        common.push({
          feature,
          prevalence: count / explanations.length
        });
      }
    }
    
    return common;
  }
}

/**
 * Explanation evolution analyzer
 */
class ExplanationEvolutionAnalyzer {
  analyze(history) {
    // Analyze how explanations evolve over iterations
    return {
      consistency: this.measureConsistency(history),
      drift: this.measureDrift(history),
      convergence: this.measureConvergence(history)
    };
  }
  
  measureConsistency(history) {
    // Implementation details...
    return 0.8;
  }
  
  measureDrift(history) {
    // Implementation details...
    return 0.2;
  }
  
  measureConvergence(history) {
    // Implementation details...
    return true;
  }
}

/**
 * Feature importance tracker
 */
class FeatureImportanceTracker {
  analyzeStability(featureMap) {
    const unstableFeatures = [];
    let totalVolatility = 0;
    
    for (const [feature, history] of featureMap) {
      const volatility = this.calculateVolatility(history);
      totalVolatility += volatility;
      
      if (volatility > 0.3) {
        unstableFeatures.push({
          feature,
          volatility,
          trend: this.calculateTrend(history)
        });
      }
    }
    
    return {
      hasSignificantChanges: unstableFeatures.length > 0,
      unstableFeatures,
      averageVolatility: totalVolatility / featureMap.size
    };
  }
  
  calculateVolatility(history) {
    if (history.length < 2) return 0;
    
    let sumChanges = 0;
    for (let i = 1; i < history.length; i++) {
      sumChanges += Math.abs(history[i].impact - history[i - 1].impact);
    }
    
    return sumChanges / (history.length - 1);
  }
  
  calculateTrend(history) {
    if (history.length < 2) return 'stable';
    
    const first = history[0].impact;
    const last = history[history.length - 1].impact;
    const diff = last - first;
    
    if (Math.abs(diff) < 0.05) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }
}

export default ExplainableConfidenceTracker;
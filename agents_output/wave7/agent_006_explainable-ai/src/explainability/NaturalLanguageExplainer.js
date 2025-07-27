/**
 * NaturalLanguageExplainer.js
 * 
 * Generates human-readable explanations for ML confidence scores.
 * Supports multiple languages and customizable templates.
 */

export class NaturalLanguageExplainer {
  constructor(options = {}) {
    this.config = {
      language: options.language || 'en',
      style: options.style || 'professional', // professional, casual, technical
      maxLength: options.maxLength || 500,
      includeRecommendations: options.includeRecommendations !== false,
      includeUncertainty: options.includeUncertainty !== false
    };
    
    // Load language templates
    this.templates = this.loadTemplates(this.config.language);
    
    // Explanation builders for different aspects
    this.builders = {
      confidence: new ConfidenceExplanationBuilder(this.templates),
      factors: new FactorExplanationBuilder(this.templates),
      comparison: new ComparisonExplanationBuilder(this.templates),
      recommendation: new RecommendationBuilder(this.templates)
    };
    
    // Style processors
    this.styleProcessors = {
      professional: new ProfessionalStyleProcessor(),
      casual: new CasualStyleProcessor(),
      technical: new TechnicalStyleProcessor()
    };
  }
  
  /**
   * Generate a summary explanation
   */
  async generateSummary(context) {
    const { file, result, explanations } = context;
    
    // Build summary components
    const components = {
      opening: this.generateOpening(result.overall),
      confidence: this.explainConfidenceLevel(result.overall),
      mainFactors: this.summarizeMainFactors(explanations),
      conclusion: this.generateConclusion(result, explanations)
    };
    
    // Combine components
    let summary = this.combineComponents(components);
    
    // Apply style processing
    summary = this.applyStyle(summary);
    
    // Ensure length constraints
    summary = this.truncateToLength(summary, this.config.maxLength);
    
    return summary;
  }
  
  /**
   * Explain the confidence score
   */
  async explainConfidence(result) {
    const level = this.categorizeConfidence(result.overall);
    const explanation = this.builders.confidence.build({
      score: result.overall,
      level,
      dimensions: result.dimensions,
      convergence: result.convergence
    });
    
    return this.applyStyle(explanation);
  }
  
  /**
   * Explain contributing factors
   */
  async explainFactors(explanations) {
    const factors = [];
    
    // Extract key factors from SHAP
    if (explanations.shap && !explanations.shap.error) {
      const shapFactors = this.extractSHAPFactors(explanations.shap);
      factors.push(...shapFactors);
    }
    
    // Extract factors from LIME
    if (explanations.lime && !explanations.lime.error) {
      const limeFactors = this.extractLIMEFactors(explanations.lime);
      factors.push(...limeFactors);
    }
    
    // Extract attention focus areas
    if (explanations.attention && !explanations.attention.error) {
      const attentionFactors = this.extractAttentionFactors(explanations.attention);
      factors.push(...attentionFactors);
    }
    
    // Build factor explanations
    const factorExplanations = this.builders.factors.build(factors);
    
    return this.applyStyle(factorExplanations);
  }
  
  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(context) {
    if (!this.config.includeRecommendations) {
      return null;
    }
    
    const { result, explanations } = context;
    const recommendations = [];
    
    // Extract recommendations from counterfactuals
    if (explanations.counterfactuals && !explanations.counterfactuals.error) {
      const cfRecommendations = this.extractCounterfactualRecommendations(
        explanations.counterfactuals
      );
      recommendations.push(...cfRecommendations);
    }
    
    // Add confidence-based recommendations
    const confidenceRecs = this.generateConfidenceRecommendations(result);
    recommendations.push(...confidenceRecs);
    
    // Add dimension-specific recommendations
    const dimensionRecs = this.generateDimensionRecommendations(result.dimensions);
    recommendations.push(...dimensionRecs);
    
    // Build recommendation text
    const recommendationText = this.builders.recommendation.build(recommendations);
    
    return this.applyStyle(recommendationText);
  }
  
  /**
   * Combine multiple explanation sections into a narrative
   */
  async combineNarrative(sections) {
    const { summary, confidence, factors, recommendations } = sections;
    
    // Create narrative structure
    const narrative = [];
    
    // Add summary as introduction
    if (summary) {
      narrative.push(summary);
    }
    
    // Add detailed confidence explanation
    if (confidence && !summary) {
      narrative.push(confidence);
    }
    
    // Add factor analysis
    if (factors) {
      narrative.push(this.templates.transitions.furthermore + ' ' + factors);
    }
    
    // Add recommendations
    if (recommendations) {
      narrative.push(this.templates.transitions.consequently + ' ' + recommendations);
    }
    
    // Join with appropriate spacing
    return narrative.join('\n\n');
  }
  
  /**
   * Generate opening statement
   */
  generateOpening(confidenceScore) {
    const percentage = (confidenceScore * 100).toFixed(1);
    const level = this.categorizeConfidence(confidenceScore);
    
    return this.templates.openings[level]
      .replace('{score}', percentage)
      .replace('{level}', this.templates.levels[level]);
  }
  
  /**
   * Explain confidence level in detail
   */
  explainConfidenceLevel(score) {
    const level = this.categorizeConfidence(score);
    const percentage = (score * 100).toFixed(1);
    
    let explanation = this.templates.confidence[level]
      .replace('{score}', percentage);
    
    // Add uncertainty if configured
    if (this.config.includeUncertainty) {
      const uncertainty = this.calculateUncertainty(score);
      if (uncertainty > 0.1) {
        explanation += ' ' + this.templates.uncertainty.moderate
          .replace('{range}', `±${(uncertainty * 100).toFixed(1)}%`);
      }
    }
    
    return explanation;
  }
  
  /**
   * Summarize main contributing factors
   */
  summarizeMainFactors(explanations) {
    const mainFactors = [];
    
    // Get top 3 factors from SHAP
    if (explanations.shap?.keyContributors) {
      const topFactors = explanations.shap.keyContributors.slice(0, 3);
      mainFactors.push(...topFactors.map(f => ({
        name: this.humanizeFeatureName(f.feature),
        impact: f.impact,
        direction: f.impact > 0 ? 'positive' : 'negative'
      })));
    }
    
    if (mainFactors.length === 0) {
      return this.templates.factors.none;
    }
    
    // Build factor list
    const factorDescriptions = mainFactors.map(f => {
      const impact = Math.abs(f.impact * 100).toFixed(0);
      return this.templates.factors.item
        .replace('{name}', f.name)
        .replace('{impact}', impact)
        .replace('{direction}', this.templates.directions[f.direction]);
    });
    
    return this.templates.factors.intro + ' ' + 
           this.joinWithCommas(factorDescriptions) + '.';
  }
  
  /**
   * Generate conclusion based on analysis
   */
  generateConclusion(result, explanations) {
    const level = this.categorizeConfidence(result.overall);
    let conclusion = this.templates.conclusions[level];
    
    // Add convergence information if available
    if (result.convergence?.converged) {
      conclusion += ' ' + this.templates.convergence.achieved
        .replace('{iterations}', result.convergence.iterations);
    }
    
    return conclusion;
  }
  
  /**
   * Extract factors from SHAP explanation
   */
  extractSHAPFactors(shapExplanation) {
    if (!shapExplanation.keyContributors) return [];
    
    return shapExplanation.keyContributors.map(contributor => ({
      type: 'shap',
      name: this.humanizeFeatureName(contributor.feature),
      value: contributor.impact,
      description: this.describeSHAPContribution(contributor),
      importance: Math.abs(contributor.impact)
    }));
  }
  
  /**
   * Extract factors from LIME explanation
   */
  extractLIMEFactors(limeExplanation) {
    if (!limeExplanation.rules) return [];
    
    return limeExplanation.rules.map(rule => ({
      type: 'lime',
      name: this.humanizeFeatureName(rule.feature),
      value: rule.impact,
      description: this.describeLIMERule(rule),
      importance: Math.abs(rule.impact)
    }));
  }
  
  /**
   * Extract factors from attention analysis
   */
  extractAttentionFactors(attentionAnalysis) {
    if (!attentionAnalysis.focusAreas) return [];
    
    return attentionAnalysis.focusAreas.map(area => ({
      type: 'attention',
      name: this.humanizeFeatureName(area.area),
      value: area.weight,
      description: this.describeAttentionFocus(area),
      importance: area.weight
    }));
  }
  
  /**
   * Extract recommendations from counterfactuals
   */
  extractCounterfactualRecommendations(counterfactuals) {
    if (!counterfactuals.recommendations) return [];
    
    return counterfactuals.recommendations.map(rec => ({
      type: 'counterfactual',
      action: rec.action,
      impact: rec.expectedOutcome,
      feasibility: rec.feasibility,
      priority: this.calculatePriority(rec)
    }));
  }
  
  /**
   * Generate confidence-based recommendations
   */
  generateConfidenceRecommendations(result) {
    const recommendations = [];
    const level = this.categorizeConfidence(result.overall);
    
    if (level === 'low' || level === 'very_low') {
      recommendations.push({
        type: 'improvement',
        action: this.templates.recommendations.improve.lowConfidence,
        priority: 'high'
      });
    } else if (level === 'moderate') {
      recommendations.push({
        type: 'optimization',
        action: this.templates.recommendations.optimize.moderate,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate dimension-specific recommendations
   */
  generateDimensionRecommendations(dimensions) {
    const recommendations = [];
    
    // Find weakest dimension
    const weakest = Object.entries(dimensions)
      .sort(([,a], [,b]) => a - b)[0];
    
    if (weakest && weakest[1] < 0.5) {
      recommendations.push({
        type: 'dimension',
        action: this.templates.recommendations.dimensions[weakest[0]] ||
                this.templates.recommendations.dimensions.default
                  .replace('{dimension}', this.humanizeFeatureName(weakest[0])),
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Apply style processing to text
   */
  applyStyle(text) {
    const processor = this.styleProcessors[this.config.style];
    return processor ? processor.process(text) : text;
  }
  
  /**
   * Helper methods
   */
  
  categorizeConfidence(score) {
    if (score >= 0.9) return 'very_high';
    if (score >= 0.75) return 'high';
    if (score >= 0.5) return 'moderate';
    if (score >= 0.25) return 'low';
    return 'very_low';
  }
  
  calculateUncertainty(score) {
    // Simple uncertainty based on distance from extremes
    const distanceFromExtreme = Math.min(score, 1 - score);
    return distanceFromExtreme * 0.4; // Max 20% uncertainty at 0.5
  }
  
  humanizeFeatureName(feature) {
    const mappings = {
      contentLength: 'content length',
      wordCount: 'word count',
      categoryCount: 'number of categories',
      semantic: 'semantic relevance',
      categorical: 'category alignment',
      structural: 'document structure',
      temporal: 'time relevance'
    };
    
    return mappings[feature] || feature
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
  }
  
  describeSHAPContribution(contributor) {
    const percentage = (Math.abs(contributor.impact) * 100).toFixed(1);
    const direction = contributor.impact > 0 ? 'increases' : 'decreases';
    
    return `${this.humanizeFeatureName(contributor.feature)} ${direction} confidence by ${percentage}%`;
  }
  
  describeLIMERule(rule) {
    return `When ${rule.description}, confidence ${rule.impact > 0 ? 'increases' : 'decreases'} by ${(Math.abs(rule.impact) * 100).toFixed(1)}%`;
  }
  
  describeAttentionFocus(area) {
    const intensity = area.weight > 0.8 ? 'strongly' : 'moderately';
    return `Model ${intensity} focuses on ${this.humanizeFeatureName(area.area)}`;
  }
  
  calculatePriority(recommendation) {
    if (recommendation.feasibility > 0.8 && recommendation.effort <= 2) {
      return 'high';
    } else if (recommendation.feasibility > 0.5) {
      return 'medium';
    }
    return 'low';
  }
  
  joinWithCommas(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(' and ');
    
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }
  
  combineComponents(components) {
    return Object.values(components)
      .filter(c => c && c.length > 0)
      .join(' ');
  }
  
  truncateToLength(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Find last complete sentence within limit
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    let result = '';
    
    for (const sentence of sentences) {
      if (result.length + sentence.length <= maxLength) {
        result += sentence;
      } else {
        break;
      }
    }
    
    return result || text.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Load language templates
   */
  loadTemplates(language) {
    // In production, load from external files
    const templates = {
      en: {
        openings: {
          very_high: 'The analysis shows a {level} confidence score of {score}%.',
          high: 'The document received a {level} confidence score of {score}%.',
          moderate: 'The analysis indicates a {level} confidence level of {score}%.',
          low: 'The document has a {level} confidence score of {score}%.',
          very_low: 'The analysis reveals a {level} confidence score of {score}%.'
        },
        levels: {
          very_high: 'very high',
          high: 'high',
          moderate: 'moderate',
          low: 'low',
          very_low: 'very low'
        },
        confidence: {
          very_high: 'This score indicates exceptional quality and relevance.',
          high: 'This represents strong alignment with quality criteria.',
          moderate: 'This suggests average quality with room for improvement.',
          low: 'This indicates below-average quality or relevance.',
          very_low: 'This suggests significant quality or relevance issues.'
        },
        factors: {
          intro: 'The main contributing factors are',
          item: '{name} ({direction} {impact}%)',
          none: 'No significant factors were identified.'
        },
        directions: {
          positive: 'contributing',
          negative: 'detracting'
        },
        conclusions: {
          very_high: 'Overall, this document demonstrates excellent quality.',
          high: 'The document meets high quality standards.',
          moderate: 'The document shows average quality characteristics.',
          low: 'The document would benefit from improvements.',
          very_low: 'Significant enhancements are recommended.'
        },
        transitions: {
          furthermore: 'Furthermore',
          consequently: 'Based on this analysis',
          however: 'However',
          additionally: 'Additionally'
        },
        convergence: {
          achieved: 'The confidence score stabilized after {iterations} iterations.',
          pending: 'The score is still converging.'
        },
        uncertainty: {
          low: 'with high certainty',
          moderate: 'with an uncertainty range of {range}',
          high: 'though significant uncertainty exists ({range})'
        },
        recommendations: {
          improve: {
            lowConfidence: 'Consider adding more relevant content and categorization.'
          },
          optimize: {
            moderate: 'Focus on enhancing the weakest scoring dimensions.'
          },
          dimensions: {
            semantic: 'Improve content relevance and keyword usage.',
            categorical: 'Add or refine document categories.',
            structural: 'Enhance document organization and structure.',
            temporal: 'Update content to reflect current information.',
            default: 'Strengthen {dimension} aspects of the document.'
          }
        }
      }
    };
    
    return templates[language] || templates.en;
  }
}

/**
 * Explanation builders for different aspects
 */
class ConfidenceExplanationBuilder {
  constructor(templates) {
    this.templates = templates;
  }
  
  build(data) {
    const { score, level, dimensions, convergence } = data;
    let explanation = this.templates.confidence[level];
    
    // Add dimension details if significantly different
    const dimensionVariance = this.calculateDimensionVariance(dimensions);
    if (dimensionVariance > 0.2) {
      explanation += ' ' + this.explainDimensionVariance(dimensions);
    }
    
    // Add convergence information
    if (convergence?.converged) {
      explanation += ' ' + this.templates.convergence.achieved
        .replace('{iterations}', convergence.iterations);
    }
    
    return explanation;
  }
  
  calculateDimensionVariance(dimensions) {
    const values = Object.values(dimensions);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  explainDimensionVariance(dimensions) {
    const sorted = Object.entries(dimensions).sort(([,a], [,b]) => b - a);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    
    return `Performance varies across dimensions, with ${this.humanize(strongest[0])} scoring highest (${(strongest[1] * 100).toFixed(0)}%) and ${this.humanize(weakest[0])} lowest (${(weakest[1] * 100).toFixed(0)}%).`;
  }
  
  humanize(text) {
    return text.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  }
}

class FactorExplanationBuilder {
  constructor(templates) {
    this.templates = templates;
  }
  
  build(factors) {
    if (factors.length === 0) {
      return this.templates.factors.none;
    }
    
    // Group factors by type
    const grouped = this.groupFactorsByType(factors);
    
    // Build explanation for each group
    const explanations = [];
    
    for (const [type, typeFactors] of Object.entries(grouped)) {
      const explanation = this.buildTypeExplanation(type, typeFactors);
      if (explanation) explanations.push(explanation);
    }
    
    return explanations.join(' ');
  }
  
  groupFactorsByType(factors) {
    const grouped = {};
    for (const factor of factors) {
      if (!grouped[factor.type]) grouped[factor.type] = [];
      grouped[factor.type].push(factor);
    }
    return grouped;
  }
  
  buildTypeExplanation(type, factors) {
    // Sort by importance
    factors.sort((a, b) => b.importance - a.importance);
    
    // Take top 3
    const topFactors = factors.slice(0, 3);
    
    if (type === 'shap') {
      return `Key features influencing the score include ${this.listFactors(topFactors)}.`;
    } else if (type === 'lime') {
      return `Local analysis reveals that ${this.listFactors(topFactors)}.`;
    } else if (type === 'attention') {
      return `The model particularly focuses on ${this.listFactors(topFactors)}.`;
    }
    
    return null;
  }
  
  listFactors(factors) {
    return factors.map(f => f.description).join(', ');
  }
}

class ComparisonExplanationBuilder {
  constructor(templates) {
    this.templates = templates;
  }
  
  build(comparison) {
    // Build comparison explanation
    return `Compared to similar documents, this one ${comparison.description}.`;
  }
}

class RecommendationBuilder {
  constructor(templates) {
    this.templates = templates;
  }
  
  build(recommendations) {
    if (recommendations.length === 0) {
      return 'No specific recommendations at this time.';
    }
    
    // Sort by priority
    const prioritized = recommendations.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
    });
    
    // Build recommendation text
    const texts = prioritized.slice(0, 3).map(rec => rec.action);
    
    return `To improve this document, ${this.joinRecommendations(texts)}.`;
  }
  
  joinRecommendations(texts) {
    if (texts.length === 1) return texts[0];
    if (texts.length === 2) return texts.join(' and ');
    return texts.slice(0, -1).join(', ') + ', and ' + texts[texts.length - 1];
  }
}

/**
 * Style processors for different tones
 */
class ProfessionalStyleProcessor {
  process(text) {
    // Professional style is the default
    return text;
  }
}

class CasualStyleProcessor {
  process(text) {
    // Make text more casual
    return text
      .replace(/The analysis shows/g, "Here's what we found")
      .replace(/indicates/g, 'shows')
      .replace(/demonstrates/g, 'shows')
      .replace(/Furthermore/g, 'Also')
      .replace(/Consequently/g, 'So')
      .replace(/significant/g, 'big');
  }
}

class TechnicalStyleProcessor {
  process(text) {
    // Add technical details
    return text
      .replace(/confidence score/g, 'ML confidence metric')
      .replace(/analysis/g, 'algorithmic analysis')
      .replace(/factors/g, 'feature contributions');
  }
}

export default NaturalLanguageExplainer;
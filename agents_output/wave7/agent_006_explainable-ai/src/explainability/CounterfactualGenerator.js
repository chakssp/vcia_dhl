/**
 * CounterfactualGenerator.js
 * 
 * Generates counterfactual explanations showing how to change predictions.
 * Implements various algorithms for finding minimal changes.
 */

export class CounterfactualGenerator {
  constructor(options = {}) {
    this.config = {
      method: options.method || 'genetic', // genetic, gradient, random
      maxIterations: options.maxIterations || 1000,
      populationSize: options.populationSize || 50,
      mutationRate: options.mutationRate || 0.1,
      crossoverRate: options.crossoverRate || 0.7,
      eliteSize: options.eliteSize || 5,
      distanceMetric: options.distanceMetric || 'weighted_l2',
      feasibilityConstraints: options.feasibilityConstraints || [],
      diversityWeight: options.diversityWeight || 0.2
    };
    
    // Feature constraints for realistic counterfactuals
    this.constraints = new FeatureConstraints();
    
    // Distance calculator
    this.distanceCalculator = new DistanceCalculator(this.config.distanceMetric);
    
    // Diversity manager for diverse counterfactuals
    this.diversityManager = new DiversityManager();
  }
  
  /**
   * Generate counterfactual explanations
   */
  async generate(instance, prediction, options = {}) {
    const {
      targetConfidence,
      maxChanges = 5,
      featureImportance = [],
      maxScenarios = 3
    } = options;
    
    // Extract features from instance
    const originalFeatures = await this.extractFeatures(instance);
    
    // Define objective (target confidence or opposite class)
    const objective = this.defineObjective(prediction, targetConfidence);
    
    // Generate counterfactuals based on method
    let counterfactuals;
    
    switch (this.config.method) {
      case 'genetic':
        counterfactuals = await this.geneticAlgorithm(
          originalFeatures,
          objective,
          featureImportance,
          maxChanges
        );
        break;
        
      case 'gradient':
        counterfactuals = await this.gradientMethod(
          originalFeatures,
          objective,
          featureImportance,
          maxChanges
        );
        break;
        
      case 'random':
        counterfactuals = await this.randomSearch(
          originalFeatures,
          objective,
          featureImportance,
          maxChanges
        );
        break;
        
      default:
        throw new Error(`Unknown method: ${this.config.method}`);
    }
    
    // Select diverse counterfactuals
    const selected = this.selectDiverseCounterfactuals(
      counterfactuals,
      maxScenarios
    );
    
    // Convert to user-friendly format
    const scenarios = selected.map(cf => this.formatCounterfactual(
      cf,
      originalFeatures,
      instance
    ));
    
    return {
      scenarios,
      recommendations: this.extractRecommendations(scenarios),
      summary: this.generateSummary(scenarios)
    };
  }
  
  /**
   * Genetic algorithm for counterfactual generation
   */
  async geneticAlgorithm(originalFeatures, objective, featureImportance, maxChanges) {
    // Initialize population
    let population = this.initializePopulation(
      originalFeatures,
      this.config.populationSize
    );
    
    // Evolution loop
    for (let generation = 0; generation < this.config.maxIterations; generation++) {
      // Evaluate fitness
      const evaluated = await this.evaluatePopulation(
        population,
        originalFeatures,
        objective,
        featureImportance
      );
      
      // Check for valid counterfactuals
      const valid = evaluated.filter(ind => 
        this.meetsObjective(ind.prediction, objective) &&
        this.countChanges(ind.features, originalFeatures) <= maxChanges
      );
      
      if (valid.length > 0) {
        // Sort by quality (distance + diversity)
        return valid.sort((a, b) => b.fitness - a.fitness);
      }
      
      // Select parents
      const parents = this.selection(evaluated);
      
      // Create new generation
      population = this.createNewGeneration(
        parents,
        originalFeatures,
        featureImportance
      );
    }
    
    // Return best individuals even if objective not met
    return population
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, 10);
  }
  
  /**
   * Gradient-based method for counterfactual generation
   */
  async gradientMethod(originalFeatures, objective, featureImportance, maxChanges) {
    const counterfactuals = [];
    const learningRate = 0.01;
    const momentum = 0.9;
    
    // Start from multiple random initializations
    for (let start = 0; start < 10; start++) {
      let features = this.perturbFeatures(originalFeatures, 0.1);
      let velocity = this.initializeVelocity(features);
      
      for (let iter = 0; iter < this.config.maxIterations / 10; iter++) {
        // Calculate gradient
        const gradient = await this.estimateGradient(
          features,
          objective,
          originalFeatures
        );
        
        // Update with momentum
        for (const feature in gradient) {
          velocity[feature] = momentum * velocity[feature] - learningRate * gradient[feature];
          features[feature] += velocity[feature];
          
          // Apply constraints
          features[feature] = this.constraints.apply(feature, features[feature]);
        }
        
        // Check if objective met
        const prediction = await this.getPrediction(features);
        if (this.meetsObjective(prediction, objective)) {
          const changes = this.countChanges(features, originalFeatures);
          if (changes <= maxChanges) {
            counterfactuals.push({
              features,
              prediction,
              distance: this.distanceCalculator.calculate(features, originalFeatures),
              changes
            });
            break;
          }
        }
      }
    }
    
    return counterfactuals;
  }
  
  /**
   * Random search method
   */
  async randomSearch(originalFeatures, objective, featureImportance, maxChanges) {
    const counterfactuals = [];
    const importanceWeights = this.createImportanceWeights(featureImportance);
    
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      // Randomly select features to change
      const changingFeatures = this.selectChangingFeatures(
        originalFeatures,
        maxChanges,
        importanceWeights
      );
      
      // Generate random changes
      const features = { ...originalFeatures };
      for (const feature of changingFeatures) {
        features[feature] = this.randomChange(
          feature,
          originalFeatures[feature]
        );
      }
      
      // Evaluate
      const prediction = await this.getPrediction(features);
      if (this.meetsObjective(prediction, objective)) {
        counterfactuals.push({
          features,
          prediction,
          distance: this.distanceCalculator.calculate(features, originalFeatures),
          changes: changingFeatures.length
        });
      }
    }
    
    return counterfactuals;
  }
  
  /**
   * Initialize population for genetic algorithm
   */
  initializePopulation(originalFeatures, size) {
    const population = [];
    
    // Include original
    population.push({
      features: { ...originalFeatures },
      fitness: 0
    });
    
    // Generate random individuals
    for (let i = 1; i < size; i++) {
      const features = this.perturbFeatures(
        originalFeatures,
        0.3 * Math.random()
      );
      
      population.push({
        features,
        fitness: 0
      });
    }
    
    return population;
  }
  
  /**
   * Evaluate population fitness
   */
  async evaluatePopulation(population, originalFeatures, objective, featureImportance) {
    const evaluated = [];
    
    for (const individual of population) {
      const prediction = await this.getPrediction(individual.features);
      const distance = this.distanceCalculator.calculate(
        individual.features,
        originalFeatures
      );
      
      // Fitness combines objective achievement and minimal change
      let fitness = 0;
      
      // Objective component
      if (this.meetsObjective(prediction, objective)) {
        fitness += 10;
      } else {
        // Partial credit for getting closer
        fitness += 5 * (1 - Math.abs(prediction.overall - objective.target));
      }
      
      // Distance component (prefer smaller changes)
      fitness -= distance;
      
      // Feature importance component
      if (featureImportance.length > 0) {
        fitness += this.calculateImportanceBonus(
          individual.features,
          originalFeatures,
          featureImportance
        );
      }
      
      evaluated.push({
        ...individual,
        fitness,
        prediction,
        distance
      });
    }
    
    return evaluated;
  }
  
  /**
   * Selection for genetic algorithm
   */
  selection(evaluated) {
    // Sort by fitness
    evaluated.sort((a, b) => b.fitness - a.fitness);
    
    const selected = [];
    
    // Elite selection
    selected.push(...evaluated.slice(0, this.config.eliteSize));
    
    // Tournament selection for rest
    while (selected.length < this.config.populationSize / 2) {
      const tournament = this.randomSample(evaluated, 3);
      const winner = tournament.reduce((best, current) =>
        current.fitness > best.fitness ? current : best
      );
      selected.push(winner);
    }
    
    return selected;
  }
  
  /**
   * Create new generation through crossover and mutation
   */
  createNewGeneration(parents, originalFeatures, featureImportance) {
    const newGeneration = [];
    
    // Keep elite
    newGeneration.push(...parents.slice(0, this.config.eliteSize));
    
    // Create offspring
    while (newGeneration.length < this.config.populationSize) {
      const parent1 = this.randomChoice(parents);
      const parent2 = this.randomChoice(parents);
      
      // Crossover
      if (Math.random() < this.config.crossoverRate) {
        const offspring = this.crossover(parent1, parent2);
        newGeneration.push(offspring);
      } else {
        newGeneration.push({ ...parent1 });
      }
      
      // Mutation
      if (Math.random() < this.config.mutationRate) {
        const lastIndex = newGeneration.length - 1;
        newGeneration[lastIndex] = this.mutate(
          newGeneration[lastIndex],
          originalFeatures,
          featureImportance
        );
      }
    }
    
    return newGeneration;
  }
  
  /**
   * Crossover operation
   */
  crossover(parent1, parent2) {
    const features = {};
    const featureNames = Object.keys(parent1.features);
    
    // Uniform crossover
    for (const feature of featureNames) {
      features[feature] = Math.random() > 0.5 ?
        parent1.features[feature] :
        parent2.features[feature];
    }
    
    return {
      features,
      fitness: 0
    };
  }
  
  /**
   * Mutation operation
   */
  mutate(individual, originalFeatures, featureImportance) {
    const features = { ...individual.features };
    const featureNames = Object.keys(features);
    
    // Select feature to mutate (biased by importance)
    const weights = this.createImportanceWeights(featureImportance);
    const feature = this.weightedRandomChoice(featureNames, weights);
    
    // Apply mutation
    features[feature] = this.mutateFeature(
      feature,
      features[feature],
      originalFeatures[feature]
    );
    
    return {
      features,
      fitness: 0
    };
  }
  
  /**
   * Select diverse counterfactuals
   */
  selectDiverseCounterfactuals(counterfactuals, maxScenarios) {
    if (counterfactuals.length <= maxScenarios) {
      return counterfactuals;
    }
    
    const selected = [];
    const remaining = [...counterfactuals];
    
    // Select best one first
    selected.push(remaining.shift());
    
    // Select diverse ones
    while (selected.length < maxScenarios && remaining.length > 0) {
      let maxDiversity = -1;
      let mostDiverse = null;
      let mostDiverseIndex = -1;
      
      // Find most diverse from selected
      for (let i = 0; i < remaining.length; i++) {
        const diversity = this.diversityManager.calculateDiversity(
          remaining[i],
          selected
        );
        
        if (diversity > maxDiversity) {
          maxDiversity = diversity;
          mostDiverse = remaining[i];
          mostDiverseIndex = i;
        }
      }
      
      if (mostDiverse) {
        selected.push(mostDiverse);
        remaining.splice(mostDiverseIndex, 1);
      }
    }
    
    return selected;
  }
  
  /**
   * Format counterfactual for output
   */
  formatCounterfactual(counterfactual, originalFeatures, instance) {
    const changes = [];
    
    // Identify changes
    for (const [feature, newValue] of Object.entries(counterfactual.features)) {
      const oldValue = originalFeatures[feature];
      if (Math.abs(newValue - oldValue) > 0.001) {
        changes.push({
          feature,
          oldValue,
          newValue,
          delta: newValue - oldValue,
          description: this.describeChange(feature, oldValue, newValue)
        });
      }
    }
    
    // Sort by impact
    changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    
    return {
      changes,
      predictedConfidence: counterfactual.prediction.overall,
      distance: counterfactual.distance,
      feasibility: this.assessFeasibility(changes),
      instance: this.reconstructInstance(instance, counterfactual.features)
    };
  }
  
  /**
   * Helper methods
   */
  
  defineObjective(prediction, targetConfidence) {
    if (targetConfidence !== undefined) {
      return {
        type: 'regression',
        target: targetConfidence
      };
    }
    
    // Default: flip to opposite confidence level
    return {
      type: 'regression',
      target: prediction.overall > 0.5 ? 0.3 : 0.8
    };
  }
  
  meetsObjective(prediction, objective) {
    const tolerance = 0.05;
    return Math.abs(prediction.overall - objective.target) < tolerance;
  }
  
  countChanges(features, original) {
    let count = 0;
    for (const feature in features) {
      if (Math.abs(features[feature] - original[feature]) > 0.001) {
        count++;
      }
    }
    return count;
  }
  
  perturbFeatures(features, strength) {
    const perturbed = {};
    for (const [feature, value] of Object.entries(features)) {
      if (typeof value === 'number') {
        const noise = (Math.random() - 0.5) * 2 * strength;
        perturbed[feature] = this.constraints.apply(
          feature,
          value + noise * Math.abs(value)
        );
      } else {
        perturbed[feature] = value;
      }
    }
    return perturbed;
  }
  
  async estimateGradient(features, objective, original) {
    const gradient = {};
    const epsilon = 0.01;
    
    // Numerical gradient estimation
    for (const feature in features) {
      if (typeof features[feature] !== 'number') continue;
      
      // Forward difference
      const featuresPlus = { ...features };
      featuresPlus[feature] += epsilon;
      
      const predictionPlus = await this.getPrediction(featuresPlus);
      const prediction = await this.getPrediction(features);
      
      // Gradient of loss function
      const lossPlus = this.calculateLoss(predictionPlus, objective, featuresPlus, original);
      const loss = this.calculateLoss(prediction, objective, features, original);
      
      gradient[feature] = (lossPlus - loss) / epsilon;
    }
    
    return gradient;
  }
  
  calculateLoss(prediction, objective, features, original) {
    // Combined loss: objective + distance
    const objectiveLoss = Math.pow(prediction.overall - objective.target, 2);
    const distanceLoss = this.distanceCalculator.calculate(features, original) * 0.1;
    return objectiveLoss + distanceLoss;
  }
  
  initializeVelocity(features) {
    const velocity = {};
    for (const feature in features) {
      velocity[feature] = 0;
    }
    return velocity;
  }
  
  createImportanceWeights(featureImportance) {
    const weights = {};
    
    if (featureImportance.length === 0) {
      // Equal weights
      return null;
    }
    
    // Convert importance to weights
    for (const item of featureImportance) {
      weights[item.feature] = item.absImpact || Math.abs(item.impact);
    }
    
    return weights;
  }
  
  selectChangingFeatures(features, maxChanges, weights) {
    const featureNames = Object.keys(features);
    
    if (!weights) {
      // Random selection
      return this.randomSample(featureNames, 
        Math.min(maxChanges, Math.ceil(Math.random() * maxChanges))
      );
    }
    
    // Weighted selection
    const selected = [];
    const remaining = [...featureNames];
    
    while (selected.length < maxChanges && remaining.length > 0) {
      const feature = this.weightedRandomChoice(remaining, weights);
      selected.push(feature);
      remaining.splice(remaining.indexOf(feature), 1);
    }
    
    return selected;
  }
  
  randomChange(feature, currentValue) {
    if (typeof currentValue !== 'number') {
      return currentValue;
    }
    
    // Generate realistic change
    const changeStrength = 0.3 + Math.random() * 0.7;
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    const newValue = currentValue + direction * changeStrength * Math.abs(currentValue);
    return this.constraints.apply(feature, newValue);
  }
  
  calculateImportanceBonus(features, original, importance) {
    let bonus = 0;
    
    for (const item of importance) {
      const feature = item.feature;
      if (features[feature] !== original[feature]) {
        // Bonus for changing important features
        bonus += item.absImpact || Math.abs(item.impact);
      }
    }
    
    return bonus;
  }
  
  mutateFeature(feature, currentValue, originalValue) {
    if (typeof currentValue !== 'number') {
      return currentValue;
    }
    
    // Gaussian mutation
    const sigma = Math.abs(originalValue) * 0.1;
    const mutation = this.randomGaussian() * sigma;
    
    return this.constraints.apply(feature, currentValue + mutation);
  }
  
  describeChange(feature, oldValue, newValue) {
    const humanFeature = this.humanizeFeature(feature);
    
    if (typeof oldValue === 'number') {
      const delta = newValue - oldValue;
      const percentChange = Math.abs(delta / (oldValue || 1)) * 100;
      
      if (delta > 0) {
        return `Increase ${humanFeature} by ${percentChange.toFixed(0)}%`;
      } else {
        return `Decrease ${humanFeature} by ${percentChange.toFixed(0)}%`;
      }
    }
    
    return `Change ${humanFeature} from ${oldValue} to ${newValue}`;
  }
  
  assessFeasibility(changes) {
    let feasibility = 1.0;
    
    for (const change of changes) {
      // Penalize large changes
      const percentChange = Math.abs(change.delta / (change.oldValue || 1));
      if (percentChange > 0.5) {
        feasibility *= 0.7;
      }
      
      // Penalize changes to immutable features
      if (this.constraints.isImmutable(change.feature)) {
        feasibility *= 0.1;
      }
    }
    
    return feasibility;
  }
  
  reconstructInstance(originalInstance, newFeatures) {
    // Reconstruct instance with new feature values
    const reconstructed = { ...originalInstance };
    
    // Apply feature changes
    // This is simplified - in practice would need proper feature engineering
    if (newFeatures.contentLength !== undefined) {
      const ratio = newFeatures.contentLength / (originalInstance.content?.length || 1);
      reconstructed.content = this.adjustContent(originalInstance.content, ratio);
    }
    
    if (newFeatures.categoryCount !== undefined) {
      reconstructed.categories = Array(Math.round(newFeatures.categoryCount))
        .fill(null)
        .map((_, i) => `Category${i + 1}`);
    }
    
    return reconstructed;
  }
  
  async extractFeatures(instance) {
    // Extract numerical features for counterfactual generation
    return {
      contentLength: instance.content?.length || 0,
      wordCount: this.countWords(instance.content),
      categoryCount: instance.categories?.length || 0,
      daysSinceModified: this.daysSince(instance.lastModified),
      hasCategories: instance.categories?.length > 0 ? 1 : 0
    };
  }
  
  async getPrediction(features) {
    // Create pseudo-instance and get prediction
    const instance = this.createPseudoInstance(features);
    
    // In real implementation, would call the actual model
    // For now, simulate based on features
    const confidence = this.simulatePrediction(features);
    
    return {
      overall: confidence,
      dimensions: {
        semantic: confidence * 0.9,
        categorical: features.categoryCount > 0 ? 0.8 : 0.2,
        structural: confidence * 0.8,
        temporal: features.daysSinceModified < 30 ? 0.9 : 0.5
      }
    };
  }
  
  simulatePrediction(features) {
    // Simple simulation for demonstration
    let score = 0.5;
    
    // Content length contribution
    if (features.contentLength > 500) score += 0.1;
    if (features.contentLength > 1000) score += 0.1;
    
    // Category contribution
    score += Math.min(0.2, features.categoryCount * 0.05);
    
    // Recency contribution
    if (features.daysSinceModified < 7) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
  
  createPseudoInstance(features) {
    return {
      content: 'x'.repeat(features.contentLength || 100),
      categories: Array(features.categoryCount || 0).fill('Category'),
      lastModified: new Date(Date.now() - features.daysSinceModified * 86400000)
    };
  }
  
  extractRecommendations(scenarios) {
    // Extract actionable recommendations from scenarios
    return scenarios.map(scenario => {
      const mainChanges = scenario.changes.slice(0, 2);
      
      return {
        action: mainChanges.map(c => c.description).join(' and '),
        expectedOutcome: `Achieve ${(scenario.predictedConfidence * 100).toFixed(0)}% confidence`,
        effort: scenario.changes.length,
        feasibility: scenario.feasibility
      };
    });
  }
  
  generateSummary(scenarios) {
    if (scenarios.length === 0) {
      return 'No counterfactual scenarios could be generated.';
    }
    
    const best = scenarios[0];
    const changeCount = best.changes.length;
    const confidenceGain = (best.predictedConfidence - best.changes[0].oldValue) * 100;
    
    return `Found ${scenarios.length} scenarios. Best option: ${changeCount} changes for ${confidenceGain.toFixed(0)}% confidence gain.`;
  }
  
  humanizeFeature(feature) {
    const mappings = {
      contentLength: 'content length',
      wordCount: 'word count',
      categoryCount: 'number of categories',
      daysSinceModified: 'recency'
    };
    
    return mappings[feature] || feature;
  }
  
  // Utility methods
  
  randomSample(array, n) {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }
  
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  weightedRandomChoice(array, weights) {
    if (!weights) return this.randomChoice(array);
    
    const totalWeight = array.reduce((sum, item) => sum + (weights[item] || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const item of array) {
      random -= weights[item] || 1;
      if (random <= 0) return item;
    }
    
    return array[array.length - 1];
  }
  
  randomGaussian() {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  
  countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
  
  daysSince(date) {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  }
  
  adjustContent(content, ratio) {
    if (!content) return '';
    const targetLength = Math.round(content.length * ratio);
    
    if (ratio > 1) {
      // Expand content
      return content + ' ' + content.substring(0, targetLength - content.length);
    } else {
      // Truncate content
      return content.substring(0, targetLength);
    }
  }
}

/**
 * Feature constraints for realistic counterfactuals
 */
class FeatureConstraints {
  constructor() {
    this.constraints = {
      contentLength: { min: 10, max: 10000 },
      wordCount: { min: 2, max: 2000 },
      categoryCount: { min: 0, max: 10 },
      daysSinceModified: { min: 0, max: 3650 },
      hasCategories: { min: 0, max: 1 }
    };
    
    this.immutable = ['createdDate', 'id', 'author'];
  }
  
  apply(feature, value) {
    const constraint = this.constraints[feature];
    if (!constraint) return value;
    
    return Math.max(constraint.min, Math.min(constraint.max, value));
  }
  
  isImmutable(feature) {
    return this.immutable.includes(feature);
  }
}

/**
 * Distance calculator for counterfactuals
 */
class DistanceCalculator {
  constructor(metric = 'weighted_l2') {
    this.metric = metric;
    this.weights = {
      contentLength: 0.3,
      wordCount: 0.3,
      categoryCount: 0.2,
      daysSinceModified: 0.1,
      hasCategories: 0.1
    };
  }
  
  calculate(features1, features2) {
    switch (this.metric) {
      case 'l1':
        return this.l1Distance(features1, features2);
      case 'l2':
        return this.l2Distance(features1, features2);
      case 'weighted_l2':
        return this.weightedL2Distance(features1, features2);
      default:
        return this.l2Distance(features1, features2);
    }
  }
  
  l1Distance(f1, f2) {
    let distance = 0;
    for (const feature in f1) {
      if (typeof f1[feature] === 'number') {
        distance += Math.abs(f1[feature] - f2[feature]);
      }
    }
    return distance;
  }
  
  l2Distance(f1, f2) {
    let distance = 0;
    for (const feature in f1) {
      if (typeof f1[feature] === 'number') {
        distance += Math.pow(f1[feature] - f2[feature], 2);
      }
    }
    return Math.sqrt(distance);
  }
  
  weightedL2Distance(f1, f2) {
    let distance = 0;
    for (const feature in f1) {
      if (typeof f1[feature] === 'number') {
        const weight = this.weights[feature] || 1;
        distance += weight * Math.pow(f1[feature] - f2[feature], 2);
      }
    }
    return Math.sqrt(distance);
  }
}

/**
 * Diversity manager for diverse counterfactuals
 */
class DiversityManager {
  calculateDiversity(candidate, selected) {
    if (selected.length === 0) return 1;
    
    // Average distance to all selected
    let totalDistance = 0;
    
    for (const cf of selected) {
      const distance = this.featureDistance(candidate.features, cf.features);
      totalDistance += distance;
    }
    
    return totalDistance / selected.length;
  }
  
  featureDistance(f1, f2) {
    let distance = 0;
    let count = 0;
    
    for (const feature in f1) {
      if (typeof f1[feature] === 'number') {
        distance += Math.abs(f1[feature] - f2[feature]) / (Math.abs(f1[feature]) + 1);
        count++;
      }
    }
    
    return count > 0 ? distance / count : 0;
  }
}

export default CounterfactualGenerator;
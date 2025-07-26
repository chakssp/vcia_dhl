/**
 * ML Calculator Web Worker
 * 
 * Dedicated worker for CPU-intensive ML confidence calculations
 * Runs in separate thread to avoid blocking main UI thread
 */

// Worker state
let workerId = null;
let initialized = false;

// Message handler
self.onmessage = async function(event) {
    const { type, id, data } = event.data;
    
    try {
        switch (type) {
            case 'init':
                workerId = id;
                initialized = true;
                self.postMessage({ type: 'ready', id: workerId });
                break;
                
            case 'calculateConfidence':
                const confidenceResult = await calculateConfidence(data);
                self.postMessage({ type: 'result', id, result: confidenceResult });
                break;
                
            case 'calculateDimensions':
                const dimensionsResult = await calculateDimensions(data);
                self.postMessage({ type: 'result', id, result: dimensionsResult });
                break;
                
            case 'batchCalculate':
                const batchResult = await batchCalculate(data);
                self.postMessage({ type: 'result', id, result: batchResult });
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            id, 
            error: error.message,
            stack: error.stack 
        });
    }
};

/**
 * Calculate confidence scores
 */
async function calculateConfidence(data) {
    const { features, weights, config, analysisData } = data;
    
    // Calculate dimension scores
    const dimensions = {
        semantic: calculateSemanticScore(features),
        categorical: calculateCategoricalScore(features),
        structural: calculateStructuralScore(features),
        temporal: calculateTemporalScore(features)
    };
    
    // Apply adaptive weights if configured
    const adaptedWeights = config.enableAdaptiveWeights ? 
        getAdaptiveWeights(features, weights) : weights;
    
    // Calculate weighted average
    const overall = calculateWeightedAverage(dimensions, adaptedWeights);
    
    // Build result
    return {
        fileId: analysisData.fileId,
        dimensions,
        overall,
        calculatedAt: new Date().toISOString(),
        processingTime: 0, // Will be calculated by caller
        algorithm: 'worker_weighted_ensemble',
        weights: adaptedWeights,
        iteration: analysisData.iteration || 1
    };
}

/**
 * Calculate individual dimensions
 */
async function calculateDimensions(data) {
    const { features } = data;
    
    return {
        semantic: calculateSemanticScore(features),
        categorical: calculateCategoricalScore(features),
        structural: calculateStructuralScore(features),
        temporal: calculateTemporalScore(features)
    };
}

/**
 * Batch calculation for multiple items
 */
async function batchCalculate(data) {
    const { items, weights, config } = data;
    const results = [];
    
    for (const item of items) {
        const result = await calculateConfidence({
            features: item.features,
            weights,
            config,
            analysisData: item.analysisData
        });
        results.push(result);
    }
    
    return results;
}

/**
 * Calculate semantic score
 */
function calculateSemanticScore(features) {
    let score = 0.5; // Base score
    
    // Content richness factors
    if (features.wordCount > 0) {
        // Logarithmic scaling for word count
        const wordScore = Math.log10(features.wordCount + 1) / 4; // Max ~0.75 for 10k words
        score += Math.min(0.15, wordScore * 0.2);
    }
    
    // Vocabulary diversity
    if (features.uniqueWords > 0 && features.wordCount > 0) {
        const diversity = features.uniqueWords / features.wordCount;
        score += Math.min(0.15, diversity * 0.3);
    }
    
    // Embedding quality indicators
    if (features.embeddings && features.embeddings.length > 0) {
        // Magnitude indicates content strength
        if (features.embeddingMagnitude > 0) {
            const magnitudeScore = Math.tanh(features.embeddingMagnitude / 50);
            score += magnitudeScore * 0.1;
        }
        
        // Variance indicates semantic diversity
        if (features.embeddingVariance > 0) {
            const varianceScore = Math.tanh(features.embeddingVariance * 10);
            score += varianceScore * 0.1;
        }
    }
    
    return Math.max(0, Math.min(1, score));
}

/**
 * Calculate categorical score
 */
function calculateCategoricalScore(features) {
    let score = 0.3; // Base score
    
    // Category presence and diversity
    if (features.categoryCount > 0) {
        // Diminishing returns for many categories
        const categoryScore = Math.log10(features.categoryCount + 1) / 2;
        score += Math.min(0.3, categoryScore);
    }
    
    // Category confidence from AI analysis
    if (features.categoryConfidence > 0) {
        score += features.categoryConfidence * 0.4;
    }
    
    // Penalty for uncategorized content
    if (features.categoryCount === 0) {
        score *= 0.5;
    }
    
    return Math.max(0, Math.min(1, score));
}

/**
 * Calculate structural score
 */
function calculateStructuralScore(features) {
    // Start with format quality if available
    let score = features.formatQuality || 0.4;
    
    // Document structure indicators
    const structureBonus = 
        (features.hasTitle ? 0.1 : 0) +
        (features.hasSections ? 0.15 : 0) +
        (features.hasLists ? 0.1 : 0) +
        (features.hasCode ? 0.05 : 0);
    
    score += structureBonus;
    
    // Readability factors
    if (features.avgSentenceLength > 0) {
        // Optimal sentence length is 15-20 words
        const optimalLength = 17.5;
        const lengthDeviation = Math.abs(features.avgSentenceLength - optimalLength);
        const readabilityScore = Math.exp(-lengthDeviation / 20);
        score += readabilityScore * 0.1;
    }
    
    // File organization (path depth)
    if (features.depth !== undefined) {
        // Moderate depth is better than too shallow or too deep
        const optimalDepth = 3;
        const depthDeviation = Math.abs(features.depth - optimalDepth);
        const organizationScore = Math.exp(-depthDeviation / 2);
        score += organizationScore * 0.05;
    }
    
    return Math.max(0, Math.min(1, score));
}

/**
 * Calculate temporal score
 */
function calculateTemporalScore(features) {
    let score = 0.7; // Base score for current content
    
    // Recency scoring
    if (features.daysSinceModification !== undefined) {
        if (features.daysSinceModification < 7) {
            score += 0.25; // Very recent
        } else if (features.daysSinceModification < 30) {
            score += 0.15; // Recent
        } else if (features.daysSinceModification < 90) {
            score += 0.05; // Somewhat recent
        } else if (features.daysSinceModification > 365) {
            score -= 0.2; // Old content penalty
        } else if (features.daysSinceModification > 730) {
            score -= 0.3; // Very old content penalty
        }
    }
    
    // Iteration improvement bonus
    if (features.iterationCount > 0) {
        // Bonus for iterative refinement
        const iterationBonus = Math.log10(features.iterationCount + 1) / 10;
        score += Math.min(0.1, iterationBonus);
        
        // Improvement rate bonus
        if (features.improvementRate > 0) {
            score += Math.min(0.1, features.improvementRate * 0.2);
        }
    }
    
    // Consistency between creation and modification
    if (features.daysSinceCreation !== undefined && features.daysSinceModification !== undefined) {
        const updateFrequency = features.daysSinceModification / Math.max(1, features.daysSinceCreation);
        if (updateFrequency < 0.1) {
            // Frequently updated content
            score += 0.05;
        }
    }
    
    return Math.max(0, Math.min(1, score));
}

/**
 * Calculate weighted average
 */
function calculateWeightedAverage(dimensions, weights) {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [dimension, score] of Object.entries(dimensions)) {
        const weight = weights[dimension] || 0;
        weightedSum += score * weight;
        totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Get adaptive weights based on features
 */
function getAdaptiveWeights(features, baseWeights) {
    // Start with base weights
    const weights = { ...baseWeights };
    
    // Short content - prioritize structure over semantics
    if (features.contentLength < 500) {
        weights.semantic *= 0.8;
        weights.structural *= 1.2;
    }
    
    // No categories - redistribute weight
    if (features.categoryCount === 0) {
        weights.categorical *= 0.5;
        weights.semantic *= 1.1;
        weights.structural *= 1.1;
        weights.temporal *= 1.1;
    }
    
    // Old content - increase temporal importance
    if (features.daysSinceModification > 365) {
        weights.temporal *= 1.3;
    }
    
    // High-quality embeddings - boost semantic weight
    if (features.embeddingMagnitude > 50 && features.embeddingVariance > 0.5) {
        weights.semantic *= 1.2;
    }
    
    // Well-structured content - boost structure weight
    if (features.hasTitle && features.hasSections) {
        weights.structural *= 1.15;
    }
    
    // Normalize weights to sum to 1
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const key in weights) {
        weights[key] = weights[key] / sum;
    }
    
    return weights;
}

// Signal that worker is ready
self.postMessage({ type: 'ready' });
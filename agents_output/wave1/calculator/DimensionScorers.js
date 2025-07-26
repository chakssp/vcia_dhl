/**
 * DimensionScorers - Individual dimension scoring logic
 * 
 * Implements specialized scoring algorithms for each confidence dimension:
 * - Semantic: Content meaning and relevance
 * - Categorical: Classification accuracy and consistency
 * - Structural: Document organization and format quality
 * - Temporal: Time-based relevance and recency
 */

export default class DimensionScorers {
    constructor() {
        // Semantic analysis configuration
        this.semanticConfig = {
            minEmbeddingMagnitude: 0.1,
            maxEmbeddingMagnitude: 10.0,
            optimalVariance: 0.02,
            keywordBoost: 0.2,
            relevanceThreshold: 0.3
        };
        
        // Categorical analysis configuration
        this.categoricalConfig = {
            minCategories: 1,
            optimalCategories: 3,
            maxCategories: 5,
            confidenceThreshold: 0.7,
            hierarchyBonus: 0.1
        };
        
        // Structural analysis configuration
        this.structuralConfig = {
            sectionWeight: 0.3,
            listWeight: 0.2,
            codeWeight: 0.2,
            titleWeight: 0.15,
            formatWeight: 0.15
        };
        
        // Temporal analysis configuration
        this.temporalConfig = {
            recentThreshold: 7, // days
            activeThreshold: 30, // days
            staleThreshold: 180, // days
            ancientThreshold: 365, // days
            decayRate: 0.002 // per day
        };
    }
    
    /**
     * Calculate semantic confidence score
     * Analyzes content meaning, relevance, and semantic coherence
     */
    calculateSemantic(features) {
        let score = 0;
        let weights = 0;
        
        // 1. Embedding-based semantic analysis (40% weight)
        if (features.embeddings && features.embeddings.length > 0) {
            const embeddingScore = this.analyzeEmbeddings(features);
            score += embeddingScore * 0.4;
            weights += 0.4;
        }
        
        // 2. Content richness analysis (30% weight)
        const richnessScore = this.analyzeContentRichness(features);
        score += richnessScore * 0.3;
        weights += 0.3;
        
        // 3. Keyword relevance analysis (20% weight)
        const keywordScore = this.analyzeKeywordRelevance(features);
        score += keywordScore * 0.2;
        weights += 0.2;
        
        // 4. Coherence analysis (10% weight)
        const coherenceScore = this.analyzeCoherence(features);
        score += coherenceScore * 0.1;
        weights += 0.1;
        
        // Normalize by actual weights used
        const finalScore = weights > 0 ? score / weights : 0;
        
        // Apply semantic boost for high-quality content
        return this.applySemanticBoost(finalScore, features);
    }
    
    /**
     * Calculate categorical confidence score
     * Evaluates classification quality and consistency
     */
    calculateCategorical(features) {
        let score = 0;
        
        // 1. Category count optimization (30% weight)
        const countScore = this.evaluateCategoryCount(features.categoryCount);
        score += countScore * 0.3;
        
        // 2. Category confidence (40% weight)
        const confidenceScore = features.categoryConfidence || 0;
        score += confidenceScore * 0.4;
        
        // 3. Category coherence (20% weight)
        const coherenceScore = this.evaluateCategoryCoherence(features.categories);
        score += coherenceScore * 0.2;
        
        // 4. Hierarchical structure bonus (10% weight)
        const hierarchyScore = this.evaluateHierarchy(features.categories);
        score += hierarchyScore * 0.1;
        
        // Apply penalties for edge cases
        if (features.categoryCount === 0) {
            score *= 0.3; // Heavy penalty for uncategorized content
        } else if (features.categoryCount > this.categoricalConfig.maxCategories) {
            score *= 0.8; // Slight penalty for over-categorization
        }
        
        return Math.max(0, Math.min(1, score));
    }
    
    /**
     * Calculate structural confidence score
     * Assesses document organization and format quality
     */
    calculateStructural(features) {
        const weights = this.structuralConfig;
        let score = 0;
        
        // Individual structure components
        const scores = {
            section: features.hasSections ? 1.0 : 0.2,
            list: features.hasLists ? 0.9 : 0.3,
            code: features.hasCode ? 0.8 : 0.4,
            title: features.hasTitle ? 1.0 : 0.1,
            format: features.formatQuality || 0.5
        };
        
        // Weighted combination
        for (const [component, weight] of Object.entries(weights)) {
            const componentKey = component.replace('Weight', '');
            score += (scores[componentKey] || 0) * weight;
        }
        
        // Apply file type modifiers
        score = this.applyFileTypeModifier(score, features.fileType);
        
        // Depth penalty for deeply nested files
        if (features.depth > 5) {
            score *= Math.exp(-(features.depth - 5) * 0.1);
        }
        
        // Size optimization (optimal around 10-100KB)
        const sizeScore = this.evaluateFileSize(features.fileSize);
        score = score * 0.8 + sizeScore * 0.2;
        
        return Math.max(0, Math.min(1, score));
    }
    
    /**
     * Calculate temporal confidence score
     * Evaluates time-based relevance and activity patterns
     */
    calculateTemporal(features) {
        const config = this.temporalConfig;
        let score = 0.5; // Base temporal score
        
        // 1. Recency score (50% weight)
        const recencyScore = this.calculateRecencyScore(
            features.daysSinceModification,
            config
        );
        score = score * 0.5 + recencyScore * 0.5;
        
        // 2. Activity score (30% weight)
        const activityScore = this.calculateActivityScore(
            features.daysSinceCreation,
            features.daysSinceModification,
            config
        );
        score = score * 0.7 + activityScore * 0.3;
        
        // 3. Temporal consistency (20% weight)
        const consistencyScore = this.calculateTemporalConsistency(features);
        score = score * 0.8 + consistencyScore * 0.2;
        
        // Apply iteration-based adjustments
        if (features.iterationCount > 0) {
            // Recent iterations boost temporal relevance
            const iterationBoost = Math.exp(-features.iterationCount * 0.05);
            score = score * 0.9 + iterationBoost * 0.1;
        }
        
        return Math.max(0, Math.min(1, score));
    }
    
    // Semantic analysis helpers
    
    analyzeEmbeddings(features) {
        const magnitude = features.embeddingMagnitude;
        const variance = features.embeddingVariance;
        
        // Normalize magnitude to 0-1 scale
        const normalizedMagnitude = (magnitude - this.semanticConfig.minEmbeddingMagnitude) /
            (this.semanticConfig.maxEmbeddingMagnitude - this.semanticConfig.minEmbeddingMagnitude);
        const magnitudeScore = Math.max(0, Math.min(1, normalizedMagnitude));
        
        // Variance score (optimal variance indicates rich semantic content)
        const optimalVariance = this.semanticConfig.optimalVariance;
        const varianceRatio = variance / optimalVariance;
        const varianceScore = Math.exp(-Math.pow(Math.log(varianceRatio + 0.01), 2) / 2);
        
        // Combine scores
        return magnitudeScore * 0.6 + varianceScore * 0.4;
    }
    
    analyzeContentRichness(features) {
        let richness = 0;
        
        // Word count score (optimal 500-5000)
        const wordScore = this.gaussianScore(features.wordCount, 2000, 1500);
        richness += wordScore * 0.4;
        
        // Vocabulary diversity
        const vocabRatio = features.uniqueWords / Math.max(1, features.wordCount);
        const optimalRatio = 0.4; // 40% unique words is good
        const diversityScore = Math.exp(-Math.pow((vocabRatio - optimalRatio) * 5, 2));
        richness += diversityScore * 0.3;
        
        // Sentence complexity
        const complexityScore = this.gaussianScore(features.avgSentenceLength, 15, 8);
        richness += complexityScore * 0.3;
        
        return richness;
    }
    
    analyzeKeywordRelevance(features) {
        // Simplified keyword analysis (in real implementation, would check actual keywords)
        let relevance = 0.5;
        
        // Boost for certain indicators
        if (features.categoryConfidence > this.semanticConfig.relevanceThreshold) {
            relevance += this.semanticConfig.keywordBoost;
        }
        
        // Content-based adjustments
        if (features.wordCount > 100) relevance += 0.1;
        if (features.hasTitle) relevance += 0.1;
        if (features.hasSections) relevance += 0.1;
        
        return Math.max(0, Math.min(1, relevance));
    }
    
    analyzeCoherence(features) {
        // Analyze structural and semantic coherence
        let coherence = 0.5;
        
        // Structure contributes to coherence
        if (features.hasSections) coherence += 0.2;
        if (features.hasLists) coherence += 0.1;
        
        // Consistent formatting
        coherence += features.formatQuality * 0.2;
        
        return Math.max(0, Math.min(1, coherence));
    }
    
    applySemanticBoost(score, features) {
        let boostedScore = score;
        
        // High-quality content indicators
        if (features.wordCount > 1000 && features.formatQuality > 0.7) {
            boostedScore *= 1.1;
        }
        
        // Category alignment boost
        if (features.categoryConfidence > 0.8) {
            boostedScore *= 1.05;
        }
        
        return Math.max(0, Math.min(1, boostedScore));
    }
    
    // Categorical analysis helpers
    
    evaluateCategoryCount(count) {
        const { minCategories, optimalCategories, maxCategories } = this.categoricalConfig;
        
        if (count === 0) return 0;
        if (count < minCategories) return 0.3;
        if (count > maxCategories) return 0.7;
        
        // Gaussian distribution around optimal
        return this.gaussianScore(count, optimalCategories, 1);
    }
    
    evaluateCategoryCoherence(categories) {
        if (!categories || categories.length === 0) return 0;
        
        // Simplified coherence check
        // In real implementation, would analyze semantic similarity between categories
        let coherence = 0.7;
        
        // Bonus for hierarchical categories
        const hasHierarchy = categories.some(cat => cat.includes('/') || cat.includes('::'));
        if (hasHierarchy) coherence += 0.2;
        
        // Penalty for too many unrelated categories
        if (categories.length > 5) coherence -= 0.1 * (categories.length - 5);
        
        return Math.max(0, Math.min(1, coherence));
    }
    
    evaluateHierarchy(categories) {
        if (!categories || categories.length === 0) return 0;
        
        const hierarchicalCategories = categories.filter(cat => 
            cat.includes('/') || cat.includes('::') || cat.includes('>')
        );
        
        const ratio = hierarchicalCategories.length / categories.length;
        return ratio * this.categoricalConfig.hierarchyBonus + (1 - this.categoricalConfig.hierarchyBonus);
    }
    
    // Structural analysis helpers
    
    applyFileTypeModifier(score, fileType) {
        const modifiers = {
            'md': 1.2,      // Markdown - well structured
            'mdx': 1.2,     // MDX - enhanced markdown
            'org': 1.15,    // Org-mode
            'rst': 1.15,    // reStructuredText
            'tex': 1.1,     // LaTeX
            'html': 1.05,   // HTML
            'txt': 0.9,     // Plain text - less structure
            'log': 0.7,     // Log files - poor structure
            'csv': 0.8      // CSV - tabular but limited
        };
        
        const modifier = modifiers[fileType] || 1.0;
        return score * modifier;
    }
    
    evaluateFileSize(sizeInBytes) {
        if (!sizeInBytes) return 0.5;
        
        const sizeInKB = sizeInBytes / 1024;
        
        // Optimal size around 10-100KB
        if (sizeInKB < 1) return 0.3;  // Too small
        if (sizeInKB < 10) return 0.7;
        if (sizeInKB < 100) return 1.0; // Optimal
        if (sizeInKB < 1000) return 0.8;
        return 0.6; // Very large files
    }
    
    // Temporal analysis helpers
    
    calculateRecencyScore(daysSinceModification, config) {
        if (daysSinceModification <= config.recentThreshold) return 1.0;
        if (daysSinceModification <= config.activeThreshold) return 0.9;
        if (daysSinceModification <= config.staleThreshold) return 0.7;
        if (daysSinceModification <= config.ancientThreshold) return 0.5;
        
        // Exponential decay for very old content
        return Math.exp(-daysSinceModification * config.decayRate);
    }
    
    calculateActivityScore(daysSinceCreation, daysSinceModification, config) {
        // Activity ratio - how recently modified compared to age
        const age = Math.max(1, daysSinceCreation);
        const timeSinceUpdate = Math.max(0, daysSinceModification);
        const activityRatio = 1 - (timeSinceUpdate / age);
        
        // Recent creation bonus
        let score = activityRatio;
        if (daysSinceCreation <= config.activeThreshold) {
            score += 0.2;
        }
        
        // Frequent updates bonus
        if (activityRatio > 0.8) {
            score += 0.1;
        }
        
        return Math.max(0, Math.min(1, score));
    }
    
    calculateTemporalConsistency(features) {
        // Check for temporal anomalies
        let consistency = 1.0;
        
        // Creation after modification anomaly
        if (features.createdAt && features.modifiedAt && 
            new Date(features.createdAt) > new Date(features.modifiedAt)) {
            consistency *= 0.5;
        }
        
        // Future dates anomaly
        const now = new Date();
        if (features.createdAt && new Date(features.createdAt) > now) {
            consistency *= 0.3;
        }
        
        return consistency;
    }
    
    // Utility methods
    
    gaussianScore(value, mean, stdDev) {
        const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
        const exponent = -Math.pow(value - mean, 2) / (2 * Math.pow(stdDev, 2));
        return coefficient * Math.exp(exponent) * stdDev * Math.sqrt(2 * Math.PI);
    }
}
/**
 * ZeroRelevanceResolver - Resolve 0% relevance files through multi-layer analysis
 * Implements UnifiedConfidenceSystem zero relevance resolution specification
 * 
 * Strategic Context: Resolve 70%+ of files showing 0% relevance through 
 * semantic analysis, structural signals, contextual relevance, and prefix matching
 */

class ZeroRelevanceResolver {
    constructor() {
        this.logger = window.KC?.Logger || console;
        this.featureFlags = window.KC?.FeatureFlagManagerInstance;
        this.embeddingService = window.KC?.EmbeddingService;
        this.prefixEnhancer = window.KC?.PrefixEnhancerInstance;
        
        // Resolution thresholds
        this.resolutionThreshold = 15; // Minimum score to resolve from 0%
        this.maxResolutionScore = 45;  // Maximum resolved score
        this.semanticThreshold = 0.6;  // Similarity threshold for semantic analysis
        
        // Analysis weights
        this.weights = {
            semantic: 0.35,      // Semantic similarity weight
            structural: 0.25,    // Structural signals weight  
            contextual: 0.25,    // Contextual relevance weight
            prefix: 0.15         // Prefix matching weight
        };
        
        // Statistics
        this.stats = {
            resolutionAttempts: 0,
            successfulResolutions: 0,
            failedResolutions: 0,
            averageResolvedScore: 0,
            resolutionsByMethod: {
                semantic: 0,
                structural: 0,
                contextual: 0,
                prefix: 0,
                combined: 0
            }
        };
        
        this.initialized = false;
        this.initialize();
        this.registerConsoleCommands();
    }

    /**
     * Initialize the zero relevance resolver
     */
    initialize() {
        try {
            this.logger.info('ZeroRelevanceResolver: Initializing...');
            
            // Pre-compile regex patterns for structural analysis
            this.structuralPatterns = this.compileStructuralPatterns();
            
            // Initialize content quality indicators
            this.qualityIndicators = this.initializeQualityIndicators();
            
            this.initialized = true;
            this.logger.info('ZeroRelevanceResolver: Initialization complete');
            
        } catch (error) {
            this.logger.error('ZeroRelevanceResolver: Initialization failed', error);
        }
    }

    /**
     * Resolve zero relevance file through multi-layer analysis
     * @param {Object} file - File object with 0% relevance
     * @param {Object} context - Additional context for resolution
     * @returns {Object} Resolution result
     */
    async resolve(file, context = {}) {
        if (!this.isEnabled() || !this.initialized) {
            return this.getDefaultResolution();
        }

        // Skip if file doesn't have 0% relevance
        if ((file.relevanceScore || 0) > 0) {
            return this.getSkippedResolution('not_zero_relevance');
        }

        const startTime = performance.now();
        this.stats.resolutionAttempts++;
        
        try {
            this.logger.debug(`ZeroRelevanceResolver: Analyzing file ${file.id}`);
            
            // Layer 1: Semantic Analysis
            const semanticAnalysis = await this.performSemanticAnalysis(file, context);
            
            // Layer 2: Structural Signals Detection
            const structuralAnalysis = this.performStructuralAnalysis(file, context);
            
            // Layer 3: Contextual Relevance Analysis
            const contextualAnalysis = this.performContextualAnalysis(file, context);
            
            // Layer 4: Prefix Matching Enhancement
            const prefixAnalysis = await this.performPrefixAnalysis(file, context);
            
            // Combine all analyses
            const combinedAnalysis = this.combineAnalyses({
                semantic: semanticAnalysis,
                structural: structuralAnalysis,
                contextual: contextualAnalysis,
                prefix: prefixAnalysis
            });

            // Determine resolution result
            const resolution = this.determineResolution(combinedAnalysis, file);
            
            // Update statistics
            this.updateStats(resolution);
            
            return {
                ...resolution,
                fileId: file.id,
                analyses: {
                    semantic: semanticAnalysis,
                    structural: structuralAnalysis,
                    contextual: contextualAnalysis,
                    prefix: prefixAnalysis
                },
                processingTime: performance.now() - startTime,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('ZeroRelevanceResolver: Resolution failed', error);
            this.stats.failedResolutions++;
            return this.getErrorResolution(error);
        }
    }

    /**
     * Perform semantic analysis using embeddings
     */
    async performSemanticAnalysis(file, context) {
        try {
            if (!this.embeddingService) {
                return { score: 0, confidence: 0, reason: 'embedding_service_unavailable' };
            }

            // Extract content for embedding
            const content = this.extractContentForEmbedding(file, context);
            if (!content || content.length < 50) {
                return { score: 0, confidence: 0, reason: 'insufficient_content' };
            }

            // Generate embedding for file content
            const fileEmbedding = await this.embeddingService.generateEmbedding(content);
            if (!fileEmbedding) {
                return { score: 0, confidence: 0, reason: 'embedding_generation_failed' };
            }

            // Compare with high-relevance content patterns
            const referencePatterns = await this.getReferencePatterns();
            let maxSimilarity = 0;
            let bestMatch = null;

            for (const pattern of referencePatterns) {
                const similarity = this.embeddingService.calculateSimilarity(
                    fileEmbedding, 
                    pattern.embedding
                );
                
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    bestMatch = pattern;
                }
            }

            // Calculate semantic score
            const semanticScore = maxSimilarity >= this.semanticThreshold ? 
                maxSimilarity * 60 : maxSimilarity * 20; // Boost for threshold pass

            return {
                score: Math.min(semanticScore, 50),
                confidence: maxSimilarity,
                maxSimilarity: maxSimilarity,
                bestMatch: bestMatch?.type || 'none',
                reason: maxSimilarity >= this.semanticThreshold ? 
                    'semantic_similarity_found' : 'low_semantic_similarity'
            };

        } catch (error) {
            this.logger.error('ZeroRelevanceResolver: Semantic analysis failed', error);
            return { score: 0, confidence: 0, reason: 'semantic_analysis_error' };
        }
    }

    /**
     * Perform structural signals detection
     */
    performStructuralAnalysis(file, context) {
        try {
            const content = file.content || file.preview || context.content || '';
            const filename = file.name || file.path || '';
            
            let structuralScore = 0;
            const detectedSignals = [];

            // Headers detection (# ## ###)
            const headerMatches = content.match(this.structuralPatterns.headers);
            if (headerMatches && headerMatches.length > 0) {
                const headerScore = Math.min(headerMatches.length * 3, 15);
                structuralScore += headerScore;
                detectedSignals.push({
                    type: 'headers',
                    count: headerMatches.length,
                    score: headerScore
                });
            }

            // Lists detection (- * 1.)
            const listMatches = content.match(this.structuralPatterns.lists);
            if (listMatches && listMatches.length >= 3) {
                const listScore = Math.min(listMatches.length * 1.5, 10);
                structuralScore += listScore;
                detectedSignals.push({
                    type: 'lists',
                    count: listMatches.length,
                    score: listScore
                });
            }

            // Code blocks detection (``` ```)
            const codeMatches = content.match(this.structuralPatterns.codeBlocks);
            if (codeMatches && codeMatches.length > 0) {
                const codeScore = Math.min(codeMatches.length * 5, 20);
                structuralScore += codeScore;
                detectedSignals.push({
                    type: 'code_blocks',
                    count: codeMatches.length,
                    score: codeScore
                });
            }

            // Links detection ([text](url))
            const linkMatches = content.match(this.structuralPatterns.links);
            if (linkMatches && linkMatches.length > 0) {
                const linkScore = Math.min(linkMatches.length * 2, 10);
                structuralScore += linkScore;
                detectedSignals.push({
                    type: 'links',
                    count: linkMatches.length,
                    score: linkScore
                });
            }

            // Tables detection (|column|column|)
            const tableMatches = content.match(this.structuralPatterns.tables);
            if (tableMatches && tableMatches.length > 0) {
                const tableScore = Math.min(tableMatches.length * 4, 15);
                structuralScore += tableScore;
                detectedSignals.push({
                    type: 'tables',
                    count: tableMatches.length,
                    score: tableScore
                });
            }

            // Technical keywords
            const techKeywords = this.detectTechnicalKeywords(content);
            if (techKeywords.length > 0) {
                const techScore = Math.min(techKeywords.length * 2, 12);
                structuralScore += techScore;
                detectedSignals.push({
                    type: 'technical_keywords',
                    keywords: techKeywords,
                    score: techScore
                });
            }

            // File extension relevance
            const extensionScore = this.getExtensionRelevance(filename);
            if (extensionScore > 0) {
                structuralScore += extensionScore;
                detectedSignals.push({
                    type: 'file_extension',
                    extension: filename.split('.').pop(),
                    score: extensionScore
                });
            }

            return {
                score: Math.min(structuralScore, 40),
                confidence: Math.min(structuralScore / 40, 1.0),
                detectedSignals: detectedSignals,
                reason: detectedSignals.length > 0 ? 
                    'structural_signals_detected' : 'no_structural_signals'
            };

        } catch (error) {
            this.logger.error('ZeroRelevanceResolver: Structural analysis failed', error);
            return { score: 0, confidence: 0, reason: 'structural_analysis_error' };
        }
    }

    /**
     * Perform contextual relevance analysis
     */
    performContextualAnalysis(file, context) {
        try {
            let contextualScore = 0;
            const relevanceFactors = [];

            // Filename analysis
            const filenameRelevance = this.analyzeFilenameRelevance(file.name || file.path || '');
            if (filenameRelevance.score > 0) {
                contextualScore += filenameRelevance.score;
                relevanceFactors.push(filenameRelevance);
            }

            // Folder path analysis
            const pathRelevance = this.analyzeFolderPathRelevance(file.path || '');
            if (pathRelevance.score > 0) {
                contextualScore += pathRelevance.score;
                relevanceFactors.push(pathRelevance);
            }

            // File metadata analysis
            const metadataRelevance = this.analyzeMetadataRelevance(file);
            if (metadataRelevance.score > 0) {
                contextualScore += metadataRelevance.score;
                relevanceFactors.push(metadataRelevance);
            }

            // Content density analysis
            const densityRelevance = this.analyzeContentDensity(file, context);
            if (densityRelevance.score > 0) {
                contextualScore += densityRelevance.score;
                relevanceFactors.push(densityRelevance);
            }

            // Information vs noise ratio
            const informationRatio = this.calculateInformationRatio(file, context);
            if (informationRatio.score > 0) {
                contextualScore += informationRatio.score;
                relevanceFactors.push(informationRatio);
            }

            return {
                score: Math.min(contextualScore, 35),
                confidence: Math.min(contextualScore / 35, 1.0),
                relevanceFactors: relevanceFactors,
                reason: relevanceFactors.length > 0 ? 
                    'contextual_relevance_found' : 'no_contextual_relevance'
            };

        } catch (error) {
            this.logger.error('ZeroRelevanceResolver: Contextual analysis failed', error);
            return { score: 0, confidence: 0, reason: 'contextual_analysis_error' };
        }
    }

    /**
     * Perform prefix matching analysis
     */
    async performPrefixAnalysis(file, context) {
        try {
            if (!this.prefixEnhancer) {
                return { score: 0, confidence: 0, reason: 'prefix_enhancer_unavailable' };
            }

            // Use PrefixEnhancer to find matches
            const prefixResult = await this.prefixEnhancer.enhance(file, context);
            
            if (!prefixResult || prefixResult.enhancement === 0) {
                return { score: 0, confidence: 0, reason: 'no_prefix_matches' };
            }

            // Convert enhancement to score (enhancement is 0-0.2, convert to 0-25)
            const prefixScore = prefixResult.enhancement * 125; // Convert to 0-25 range
            
            return {
                score: Math.min(prefixScore, 25),
                confidence: prefixResult.confidence || 0,
                prefixMatches: prefixResult.prefixMatches || 0,
                topMatches: prefixResult.topMatches || [],
                reason: prefixResult.prefixMatches > 0 ? 
                    'prefix_matches_found' : 'no_prefix_matches'
            };

        } catch (error) {
            this.logger.error('ZeroRelevanceResolver: Prefix analysis failed', error);
            return { score: 0, confidence: 0, reason: 'prefix_analysis_error' };
        }
    }

    /**
     * Combine all analyses into final resolution
     */
    combineAnalyses(analyses) {
        const weightedScore = 
            (analyses.semantic.score * this.weights.semantic) +
            (analyses.structural.score * this.weights.structural) +
            (analyses.contextual.score * this.weights.contextual) +
            (analyses.prefix.score * this.weights.prefix);

        const averageConfidence = (
            analyses.semantic.confidence +
            analyses.structural.confidence +
            analyses.contextual.confidence +
            analyses.prefix.confidence
        ) / 4;

        // Determine primary resolution method
        const scores = {
            semantic: analyses.semantic.score,
            structural: analyses.structural.score,
            contextual: analyses.contextual.score,
            prefix: analyses.prefix.score
        };

        const primaryMethod = Object.keys(scores).reduce((a, b) => 
            scores[a] > scores[b] ? a : b
        );

        return {
            combinedScore: weightedScore,
            confidence: averageConfidence,
            primaryMethod: primaryMethod,
            breakdown: scores
        };
    }

    /**
     * Determine final resolution based on combined analysis
     */
    determineResolution(combinedAnalysis, file) {
        const { combinedScore, confidence, primaryMethod, breakdown } = combinedAnalysis;
        
        if (combinedScore >= this.resolutionThreshold) {
            // Successful resolution
            const resolvedScore = Math.min(combinedScore, this.maxResolutionScore);
            
            this.stats.successfulResolutions++;
            this.stats.resolutionsByMethod[primaryMethod]++;
            if (Object.values(breakdown).filter(score => score > 5).length > 1) {
                this.stats.resolutionsByMethod.combined++;
            }

            return {
                resolved: true,
                newRelevanceScore: Math.round(resolvedScore),
                confidence: confidence,
                primaryMethod: primaryMethod,
                breakdown: breakdown,
                reason: `Resolved via ${primaryMethod} analysis`,
                recommendation: 'Update file relevance score'
            };
        } else {
            // Failed to resolve
            this.stats.failedResolutions++;
            
            return {
                resolved: false,
                newRelevanceScore: 0,
                confidence: confidence,
                primaryMethod: primaryMethod,
                breakdown: breakdown,
                reason: `Score ${Math.round(combinedScore)} below threshold ${this.resolutionThreshold}`,
                recommendation: combinedScore > 5 ? 
                    'Consider manual review' : 'Likely low-value content'
            };
        }
    }

    // Helper Methods

    /**
     * Compile structural analysis regex patterns
     */
    compileStructuralPatterns() {
        return {
            headers: /^#{1,6}\s+.+$/gm,
            lists: /^[\s]*[-*+]\s+.+$|^[\s]*\d+\.\s+.+$/gm,
            codeBlocks: /```[\s\S]*?```|`[^`]+`/g,
            links: /\[([^\]]+)\]\(([^)]+)\)/g,
            tables: /\|[^|\n]*\|/g
        };
    }

    /**
     * Initialize quality indicators
     */
    initializeQualityIndicators() {
        return {
            technicalKeywords: [
                'api', 'endpoint', 'database', 'server', 'client', 'function', 'method', 'class',
                'interface', 'component', 'service', 'module', 'library', 'framework', 'algorithm',
                'performance', 'optimization', 'security', 'authentication', 'authorization',
                'deployment', 'configuration', 'environment', 'testing', 'debugging', 'logging'
            ],
            businessKeywords: [
                'strategy', 'objective', 'goal', 'kpi', 'metric', 'revenue', 'profit', 'cost',
                'budget', 'forecast', 'analysis', 'report', 'dashboard', 'insight', 'decision',
                'process', 'workflow', 'procedure', 'policy', 'compliance', 'audit', 'risk'
            ],
            qualityExtensions: {
                '.md': 8, '.txt': 5, '.doc': 6, '.docx': 6, '.pdf': 7,
                '.js': 9, '.ts': 9, '.py': 9, '.java': 8, '.cpp': 8,
                '.json': 6, '.xml': 6, '.yml': 7, '.yaml': 7, '.sql': 8
            }
        };
    }

    /**
     * Extract content for embedding analysis
     */
    extractContentForEmbedding(file, context) {
        const sources = [
            file.content,
            file.preview,
            context.content,
            context.preview
        ].filter(Boolean);

        if (sources.length === 0) return '';

        // Take first 1000 characters for embedding efficiency
        const combinedContent = sources.join(' ').substring(0, 1000);
        return combinedContent.replace(/\s+/g, ' ').trim();
    }

    /**
     * Get reference patterns for semantic comparison
     */
    async getReferencePatterns() {
        // In a real implementation, these would be loaded from high-relevance files
        // For now, return common patterns
        return [
            {
                type: 'technical_documentation',
                embedding: await this.getPatternEmbedding('api documentation endpoint configuration setup'),
                weight: 1.0
            },
            {
                type: 'business_analysis',
                embedding: await this.getPatternEmbedding('analysis insights strategy objectives goals metrics'),
                weight: 0.9
            },
            {
                type: 'project_planning',
                embedding: await this.getPatternEmbedding('project plan timeline milestone deliverable requirements'),
                weight: 0.8
            }
        ];
    }

    /**
     * Get pattern embedding (with caching)
     */
    async getPatternEmbedding(text) {
        if (!this.embeddingService) return null;
        
        // Simple cache for pattern embeddings
        if (!this.patternEmbeddingCache) {
            this.patternEmbeddingCache = new Map();
        }
        
        if (this.patternEmbeddingCache.has(text)) {
            return this.patternEmbeddingCache.get(text);
        }
        
        const embedding = await this.embeddingService.generateEmbedding(text);
        if (embedding) {
            this.patternEmbeddingCache.set(text, embedding);
        }
        
        return embedding;
    }

    /**
     * Detect technical keywords in content
     */
    detectTechnicalKeywords(content) {
        const lowerContent = content.toLowerCase();
        const allKeywords = [
            ...this.qualityIndicators.technicalKeywords,
            ...this.qualityIndicators.businessKeywords
        ];
        
        return allKeywords.filter(keyword => 
            lowerContent.includes(keyword.toLowerCase())
        );
    }

    /**
     * Get file extension relevance score
     */
    getExtensionRelevance(filename) {
        const extension = filename.split('.').pop()?.toLowerCase();
        return this.qualityIndicators.qualityExtensions[`.${extension}`] || 0;
    }

    /**
     * Analyze filename relevance
     */
    analyzeFilenameRelevance(filename) {
        if (!filename) return { score: 0, reason: 'no_filename' };
        
        let score = 0;
        const factors = [];
        
        // Length factor (not too short, not too long)
        const nameLength = filename.length;
        if (nameLength >= 10 && nameLength <= 50) {
            score += 3;
            factors.push('appropriate_length');
        }
        
        // Descriptive words
        const descriptiveWords = filename.toLowerCase().match(/\b(config|setup|guide|doc|readme|analysis|report|plan)\b/g);
        if (descriptiveWords) {
            score += descriptiveWords.length * 2;
            factors.push(`descriptive_words: ${descriptiveWords.join(', ')}`);
        }
        
        // Date patterns (suggests recent/organized content)
        const datePattern = /\d{4}[-_]\d{2}[-_]\d{2}|\d{2}[-_]\d{2}[-_]\d{4}/;
        if (datePattern.test(filename)) {
            score += 2;
            factors.push('contains_date');
        }
        
        return {
            score: Math.min(score, 8),
            factors: factors,
            reason: factors.length > 0 ? 'filename_indicators_found' : 'generic_filename'
        };
    }

    /**
     * Analyze folder path relevance
     */
    analyzeFolderPathRelevance(filepath) {
        if (!filepath) return { score: 0, reason: 'no_path' };
        
        let score = 0;
        const factors = [];
        
        // Important directories
        const importantDirs = ['docs', 'documentation', 'config', 'src', 'lib', 'api', 'analysis'];
        const pathLower = filepath.toLowerCase();
        
        for (const dir of importantDirs) {
            if (pathLower.includes(dir)) {
                score += 3;
                factors.push(`in_${dir}_directory`);
            }
        }
        
        // Organized structure (multiple levels)
        const pathLevels = filepath.split(/[/\\]/).length;
        if (pathLevels >= 3) {
            score += 2;
            factors.push('organized_structure');
        }
        
        return {
            score: Math.min(score, 8),
            factors: factors,
            reason: factors.length > 0 ? 'path_relevance_found' : 'generic_path'
        };
    }

    /**
     * Analyze file metadata relevance
     */
    analyzeMetadataRelevance(file) {
        let score = 0;
        const factors = [];
        
        // File size (not too small, not too large)
        const size = file.size || 0;
        if (size >= 1000 && size <= 100000) { // 1KB to 100KB
            score += 3;
            factors.push('appropriate_size');
        }
        
        // Recent modification
        if (file.lastModified) {
            const modDate = new Date(file.lastModified);
            const daysSince = (new Date() - modDate) / (1000 * 60 * 60 * 24);
            if (daysSince <= 180) { // Modified in last 6 months
                score += Math.max(1, 4 - Math.floor(daysSince / 45));
                factors.push('recently_modified');
            }
        }
        
        return {
            score: Math.min(score, 6),
            factors: factors,
            reason: factors.length > 0 ? 'metadata_indicators_found' : 'no_metadata_indicators'
        };
    }

    /**
     * Analyze content density
     */
    analyzeContentDensity(file, context) {
        const content = file.content || file.preview || context.content || '';
        if (!content) return { score: 0, reason: 'no_content' };
        
        let score = 0;
        const factors = [];
        
        // Word count
        const wordCount = content.split(/\s+/).length;
        if (wordCount >= 50 && wordCount <= 2000) {
            score += 3;
            factors.push(`word_count: ${wordCount}`);
        }
        
        // Sentence structure
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length >= 5) {
            score += 2;
            factors.push(`sentences: ${sentences.length}`);
        }
        
        // Paragraph structure
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
        if (paragraphs.length >= 2) {
            score += 2;
            factors.push(`paragraphs: ${paragraphs.length}`);
        }
        
        return {
            score: Math.min(score, 7),
            factors: factors,
            reason: factors.length > 0 ? 'good_content_density' : 'poor_content_density'
        };
    }

    /**
     * Calculate information vs noise ratio
     */
    calculateInformationRatio(file, context) {
        const content = file.content || file.preview || context.content || '';
        if (!content) return { score: 0, reason: 'no_content' };
        
        let informationScore = 0;
        let noiseScore = 0;
        
        // Information indicators
        const infoKeywords = ['objective', 'goal', 'solution', 'result', 'conclusion', 'summary', 'key', 'important'];
        for (const keyword of infoKeywords) {
            if (content.toLowerCase().includes(keyword)) {
                informationScore += 1;
            }
        }
        
        // Noise indicators
        const noisePatterns = [
            /\b(um|uh|er|hmm)\b/gi,         // Filler words
            /\.{3,}/g,                      // Multiple dots
            /[!]{2,}/g,                     // Multiple exclamations
            /\s{3,}/g                       // Excessive whitespace
        ];
        
        for (const pattern of noisePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                noiseScore += matches.length;
            }
        }
        
        // Calculate ratio score
        const ratio = informationScore / Math.max(noiseScore + 1, 1);
        const score = Math.min(ratio * 3, 6);
        
        return {
            score: score,
            informationScore: informationScore,
            noiseScore: noiseScore,
            ratio: ratio,
            reason: ratio > 1 ? 'good_information_ratio' : 'high_noise_ratio'
        };
    }

    /**
     * Update statistics
     */
    updateStats(resolution) {
        if (resolution.resolved) {
            const currentAvg = this.stats.averageResolvedScore;
            const count = this.stats.successfulResolutions;
            this.stats.averageResolvedScore = 
                (currentAvg * (count - 1) + resolution.newRelevanceScore) / count;
        }
    }

    /**
     * Utility methods
     */
    isEnabled() {
        return this.featureFlags?.isEnabled('zero_relevance_resolution') !== false;
    }

    getDefaultResolution() {
        return {
            resolved: false,
            reason: 'ZeroRelevanceResolver disabled or not initialized'
        };
    }

    getSkippedResolution(reason) {
        return {
            resolved: false,
            skipped: true,
            reason: reason
        };
    }

    getErrorResolution(error) {
        return {
            resolved: false,
            error: error.message,
            reason: 'Resolution analysis failed'
        };
    }

    /**
     * Set resolution threshold
     */
    setThreshold(threshold) {
        if (threshold >= 5 && threshold <= 50) {
            this.resolutionThreshold = threshold;
            this.logger.info(`ZeroRelevanceResolver: Threshold set to ${threshold}`);
            return true;
        }
        return false;
    }

    /**
     * Get resolver statistics
     */
    getStats() {
        const successRate = this.stats.resolutionAttempts > 0 ? 
            (this.stats.successfulResolutions / this.stats.resolutionAttempts) * 100 : 0;
            
        return {
            ...this.stats,
            successRate: Math.round(successRate),
            resolutionThreshold: this.resolutionThreshold,
            enabled: this.isEnabled()
        };
    }

    /**
     * Console commands registration
     */
    registerConsoleCommands() {
        if (typeof window !== 'undefined') {
            window.kczero = {
                resolve: (file) => this.resolve(file),
                stats: () => this.getStats(),
                setThreshold: (threshold) => this.setThreshold(threshold),
                test: () => this.runTestResolution()
            };
        }
    }

    /**
     * Run test resolution for validation
     */
    async runTestResolution() {
        const testFile = {
            id: 'test_zero_relevance',
            name: 'api-documentation-setup-guide.md',
            path: '/docs/api/setup/api-documentation-setup-guide.md',
            content: '# API Documentation Setup\n\nThis guide explains how to configure the API endpoints for authentication.\n\n## Objectives\n\n- Configure authentication\n- Setup endpoint routing\n- Enable logging\n\n```javascript\nconst config = {\n  auth: true,\n  endpoints: ["/api/v1"]\n};\n```',
            relevanceScore: 0,
            size: 2500,
            lastModified: new Date().toISOString()
        };

        return await this.resolve(testFile);
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.ZeroRelevanceResolver = ZeroRelevanceResolver;

// Auto-initialize if dependencies are available
if (window.KC?.FeatureFlagManagerInstance) {
    window.KC.ZeroRelevanceResolverInstance = new ZeroRelevanceResolver();
    
    // Add feature flag for zero relevance resolution
    window.KC.FeatureFlagManagerInstance.flags.set('zero_relevance_resolution', {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable zero relevance file resolution through multi-layer analysis'
    });
}

export default ZeroRelevanceResolver;
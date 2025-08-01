/**
 * QdrantScoreBridge - Connects Qdrant semantic scores to UI file confidence
 * Implements UnifiedConfidenceSystem specification for score integration
 * 
 * Strategic Context: 351 Qdrant points with intelligence scores (~21.5) 
 * need to be mapped to AppState files showing 0% relevance
 */

class QdrantScoreBridge {
    constructor() {
        this.scoreCache = new Map();
        this.mappingCache = new Map();
        this.initialized = false;
        this.logger = window.KC?.Logger || console;
        
        // Score normalization constants based on Qdrant data analysis
        this.QDRANT_SCORE_RANGE = {
            min: 0.1,    // Observed minimum in 351 points
            max: 45.0,   // Observed maximum
            median: 21.5 // Strategic baseline
        };
    }

    /**
     * Initialize bridge by loading Qdrant scores and establishing file mappings
     */
    async initialize() {
        try {
            this.logger.info('QdrantScoreBridge: Initializing...');
            
            // Load Qdrant points with scores
            const qdrantPoints = await this._loadQdrantPoints();
            
            // Create file ID mappings
            await this._buildFileMappings(qdrantPoints);
            
            // Cache scores for quick lookup
            this._cacheScores(qdrantPoints);
            
            this.initialized = true;
            this.logger.info(`QdrantScoreBridge: Initialized with ${qdrantPoints.length} points`);
            
            return {
                success: true,
                pointsLoaded: qdrantPoints.length,
                mappingsCreated: this.mappingCache.size
            };
            
        } catch (error) {
            this.logger.error('QdrantScoreBridge: Initialization failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get confidence score for a file ID
     * @param {string} fileId - File ID from AppState
     * @returns {Object} Confidence score with metadata
     */
    getFileConfidence(fileId) {
        if (!this.initialized) {
            this.logger.warn('QdrantScoreBridge: Not initialized, returning default score');
            return this._getDefaultScore();
        }

        // Check direct mapping first
        const qdrantId = this.mappingCache.get(fileId);
        if (qdrantId && this.scoreCache.has(qdrantId)) {
            const rawScore = this.scoreCache.get(qdrantId);
            return this._normalizeScore(rawScore, fileId);
        }

        // Try fuzzy matching by filename
        const fuzzyMatch = this._findFuzzyMatch(fileId);
        if (fuzzyMatch) {
            return this._normalizeScore(fuzzyMatch.score, fileId, 'fuzzy');
        }

        // Return default if no match found
        return this._getDefaultScore(fileId);
    }

    /**
     * Get batch confidence scores for multiple files
     * @param {Array<string>} fileIds - Array of file IDs
     * @returns {Map} Map of fileId -> confidence score
     */
    getBatchConfidence(fileIds) {
        const results = new Map();
        
        fileIds.forEach(fileId => {
            results.set(fileId, this.getFileConfidence(fileId));
        });

        return results;
    }

    /**
     * Update confidence scores for AppState files
     * @param {Array} files - Files from AppState
     * @returns {Array} Updated files with confidence scores
     */
    enhanceFilesWithConfidence(files) {
        if (!Array.isArray(files)) return files;

        return files.map(file => {
            const confidence = this.getFileConfidence(file.id);
            
            return {
                ...file,
                confidence: confidence.score,
                confidenceSource: confidence.source,
                confidenceMetadata: {
                    qdrantScore: confidence.rawScore,
                    normalizationMethod: confidence.method,
                    lastUpdated: new Date().toISOString()
                }
            };
        });
    }

    /**
     * Get bridge statistics for monitoring
     */
    getStats() {
        return {
            initialized: this.initialized,
            cachedScores: this.scoreCache.size,
            fileMappings: this.mappingCache.size,
            scoreRange: this.QDRANT_SCORE_RANGE,
            lastUpdate: this.lastUpdate || null
        };
    }

    // Private Methods

    async _loadQdrantPoints() {
        try {
            // Use existing QdrantService if available
            if (window.KC?.QdrantService) {
                const searchResult = await window.KC.QdrantService.searchByText('', {
                    limit: 1000, // Get all points
                    with_payload: true,
                    with_vector: false
                });
                
                return searchResult.result || [];
            }

            // Fallback: direct API call
            const response = await fetch('http://qdr.vcia.com.br:6333/collections/knowledge_base/points/scroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: 1000,
                    with_payload: true,
                    with_vector: false
                })
            });

            const data = await response.json();
            return data.result?.points || [];

        } catch (error) {
            this.logger.error('Failed to load Qdrant points', error);
            throw error;
        }
    }

    async _buildFileMappings(qdrantPoints) {
        // Clear existing mappings
        this.mappingCache.clear();

        qdrantPoints.forEach(point => {
            const payload = point.payload || {};
            
            // Try different mapping strategies
            const mappingCandidates = [
                payload.file_id,           // Direct file ID
                payload.filename,          // Filename
                payload.path,             // File path
                payload.title,            // Document title
                `${payload.source_file}`, // Source file reference
            ].filter(Boolean);

            // Create mappings for all candidates
            mappingCandidates.forEach(candidate => {
                this.mappingCache.set(candidate, point.id);
            });
        });

        this.logger.info(`Created ${this.mappingCache.size} file mappings`);
    }

    _cacheScores(qdrantPoints) {
        this.scoreCache.clear();

        qdrantPoints.forEach(point => {
            const payload = point.payload || {};
            
            // Extract score from various possible locations
            const score = payload.score || 
                         payload.relevance_score || 
                         payload.confidence_score ||
                         payload.intelligence_score ||
                         0;

            this.scoreCache.set(point.id, score);
        });

        this.logger.info(`Cached ${this.scoreCache.size} scores`);
    }

    _normalizeScore(rawScore, fileId, method = 'standard') {
        const { min, max, median } = this.QDRANT_SCORE_RANGE;
        
        // Normalize to 0-100 scale using statistical normalization
        let normalizedScore;
        
        if (method === 'percentile') {
            // Use median as 50% baseline
            normalizedScore = rawScore <= median ? 
                (rawScore / median) * 50 : 
                50 + ((rawScore - median) / (max - median)) * 50;
        } else {
            // Linear normalization
            normalizedScore = ((rawScore - min) / (max - min)) * 100;
        }

        // Ensure bounds
        normalizedScore = Math.max(0, Math.min(100, normalizedScore));

        return {
            score: Math.round(normalizedScore),
            rawScore: rawScore,
            source: 'qdrant',
            method: method,
            fileId: fileId,
            timestamp: new Date().toISOString()
        };
    }

    _findFuzzyMatch(fileId) {
        // Simple fuzzy matching by filename similarity
        const fileName = fileId.split('/').pop() || fileId;
        
        for (const [mappedId, qdrantId] of this.mappingCache.entries()) {
            const mappedFileName = mappedId.split('/').pop() || mappedId;
            
            if (this._calculateSimilarity(fileName, mappedFileName) > 0.8) {
                const score = this.scoreCache.get(qdrantId);
                if (score !== undefined) {
                    return { score, qdrantId };
                }
            }
        }
        
        return null;
    }

    _calculateSimilarity(str1, str2) {
        // Simple Jaccard similarity for filename matching
        const set1 = new Set(str1.toLowerCase().split(''));
        const set2 = new Set(str2.toLowerCase().split(''));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    _getDefaultScore(fileId = null) {
        return {
            score: 0,
            rawScore: 0,
            source: 'default',
            method: 'fallback',
            fileId: fileId,
            timestamp: new Date().toISOString()
        };
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.QdrantScoreBridge = QdrantScoreBridge;

// Auto-initialize if QdrantService is available
if (window.KC?.QdrantService) {
    window.KC.QdrantScoreBridgeInstance = new QdrantScoreBridge();
}

export default QdrantScoreBridge;
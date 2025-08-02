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
                // Use scroll method to get all points without search text
                const scrollResult = await window.KC.QdrantService.scrollPoints({
                    limit: 1000, // Get all points
                    with_payload: true,
                    with_vector: false
                });
                
                return scrollResult.points || [];
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
            
            // Try different mapping strategies - ENHANCED for better AppState compatibility
            const mappingCandidates = [
                payload.file_id,           // Direct file ID
                payload.fileId,            // camelCase variant
                payload.filename,          // Filename
                payload.fileName,          // camelCase variant
                payload.path,             // File path
                payload.filePath,         // camelCase variant
                payload.title,            // Document title
                payload.name,             // Alternative name field
                payload.file_name,        // Alternative filename field
                payload.document_id,      // Document ID
                payload.documentId,       // camelCase variant
                payload.source_file,      // Source file reference
                payload.sourceFile,       // camelCase variant
                // Additional fields that might contain file identifiers
                payload.id,               // Generic ID
                payload.key,              // Generic key
                payload.reference,        // Reference field
                payload.source,           // Source field
            ].filter(Boolean);

            // Create mappings for all candidates
            mappingCandidates.forEach(candidate => {
                // Original mapping
                this.mappingCache.set(candidate, point.id);
                
                // Normalized lowercase mapping for case-insensitive matching
                const normalized = candidate.toString().toLowerCase();
                this.mappingCache.set(normalized, point.id);
                
                // Also create mapping for just the filename without path
                if (candidate.includes('/') || candidate.includes('\\')) {
                    const filename = candidate.split(/[/\\]/).pop();
                    if (filename) {
                        this.mappingCache.set(filename, point.id);
                        this.mappingCache.set(filename.toLowerCase(), point.id);
                    }
                }
                
                // Create mapping for filename without extension
                if (candidate.includes('.')) {
                    const nameWithoutExt = candidate.replace(/\.[^/.]+$/, '');
                    this.mappingCache.set(nameWithoutExt, point.id);
                    this.mappingCache.set(nameWithoutExt.toLowerCase(), point.id);
                }
                
                // Extract documentId from various formats
                if (payload.documentId || payload.document_id) {
                    const docId = payload.documentId || payload.document_id;
                    this.mappingCache.set(docId, point.id);
                    this.mappingCache.set(docId.toLowerCase(), point.id);
                }
            });
        });

        this.logger.info(`Enhanced mapping: Created ${this.mappingCache.size} file mappings from ${qdrantPoints.length} points`);
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
        // Enhanced fuzzy matching with multiple strategies
        const fileName = fileId.split(/[/\\]/).pop() || fileId;
        const fileNameLower = fileName.toLowerCase();
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        
        let bestMatch = null;
        let bestSimilarity = 0.6; // Minimum threshold
        
        for (const [mappedId, qdrantId] of this.mappingCache.entries()) {
            const mappedFileName = mappedId.split(/[/\\]/).pop() || mappedId;
            const mappedFileNameLower = mappedFileName.toLowerCase();
            const mappedFileNameWithoutExt = mappedFileName.replace(/\.[^/.]+$/, '');
            
            // Strategy 1: Exact filename match (case insensitive)
            if (fileNameLower === mappedFileNameLower) {
                const score = this.scoreCache.get(qdrantId);
                if (score !== undefined) {
                    return { score, qdrantId, similarity: 1.0, method: 'exact_filename' };
                }
            }
            
            // Strategy 2: Filename without extension match
            if (fileNameWithoutExt.toLowerCase() === mappedFileNameWithoutExt.toLowerCase()) {
                const score = this.scoreCache.get(qdrantId);
                if (score !== undefined && 0.95 > bestSimilarity) {
                    bestMatch = { score, qdrantId, similarity: 0.95, method: 'filename_no_ext' };
                    bestSimilarity = 0.95;
                }
            }
            
            // Strategy 3: Jaccard similarity
            const jaccardSimilarity = this._calculateSimilarity(fileNameLower, mappedFileNameLower);
            if (jaccardSimilarity > bestSimilarity) {
                const score = this.scoreCache.get(qdrantId);
                if (score !== undefined) {
                    bestMatch = { score, qdrantId, similarity: jaccardSimilarity, method: 'jaccard' };
                    bestSimilarity = jaccardSimilarity;
                }
            }
            
            // Strategy 4: Levenshtein-based similarity for close matches
            if (fileName.length > 3 && mappedFileName.length > 3) {
                const levenshteinSimilarity = this._calculateLevenshteinSimilarity(fileNameLower, mappedFileNameLower);
                if (levenshteinSimilarity > bestSimilarity) {
                    const score = this.scoreCache.get(qdrantId);
                    if (score !== undefined) {
                        bestMatch = { score, qdrantId, similarity: levenshteinSimilarity, method: 'levenshtein' };
                        bestSimilarity = levenshteinSimilarity;
                    }
                }
            }
        }
        
        return bestMatch;
    }

    _calculateSimilarity(str1, str2) {
        // Simple Jaccard similarity for filename matching
        const set1 = new Set(str1.toLowerCase().split(''));
        const set2 = new Set(str2.toLowerCase().split(''));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    _calculateLevenshteinSimilarity(str1, str2) {
        // Calculate Levenshtein distance and convert to similarity score
        const distance = this._levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        
        if (maxLength === 0) return 1.0;
        
        return 1 - (distance / maxLength);
    }

    _levenshteinDistance(str1, str2) {
        // Dynamic programming implementation of Levenshtein distance
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
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
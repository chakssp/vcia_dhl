/**
 * PrefixEnhancer - Utilize 163,075 prefixes from PrefixCache to improve confidence
 * Implements UnifiedConfidenceSystem prefix enhancement specification
 * 
 * Strategic Context: Use loaded prefixes for intelligent confidence enhancement
 * Connects to PrefixCache collection in Qdrant (384 dimensions)
 */

class PrefixEnhancer {
    constructor() {
        this.logger = window.KC?.Logger || console;
        this.featureFlags = window.KC?.FeatureFlagManagerInstance;
        this.qdrantService = window.KC?.QdrantService;
        
        // Cache and indexing
        this.prefixIndex = new Map(); // Inverted index for O(log n) search
        this.lruCache = new Map();    // LRU cache for top 1000 prefixes
        this.maxCacheSize = 1000;
        this.cacheAccessOrder = [];
        
        // Enhancement settings
        this.maxEnhancement = 0.2;    // Maximum 20% enhancement
        this.minPrefixLength = 3;     // Minimum prefix length
        this.enhancementThreshold = 0.6; // Similarity threshold
        
        // Statistics
        this.stats = {
            enhancements: 0,
            cacheHits: 0,
            cacheMisses: 0,
            prefixesLoaded: 0,
            avgEnhancement: 0,
            prefixUtilization: 0
        };
        
        this.initialized = false;
        this.initializeAsync();
        this.registerConsoleCommands();
    }

    /**
     * Initialize prefix enhancer asynchronously
     */
    async initializeAsync() {
        try {
            if (!this.isEnabled()) {
                this.logger.info('PrefixEnhancer: Disabled via feature flag');
                return;
            }

            this.logger.info('PrefixEnhancer: Starting initialization...');
            
            // Load prefixes from Qdrant PrefixCache collection
            await this.loadPrefixCache();
            
            // Build inverted index for fast lookups
            await this.buildPrefixIndex();
            
            this.initialized = true;
            this.logger.info(`PrefixEnhancer: Initialized with ${this.stats.prefixesLoaded} prefixes`);
            
        } catch (error) {
            this.logger.error('PrefixEnhancer: Initialization failed', error);
        }
    }

    /**
     * Enhance file confidence using prefix matching
     * @param {Object} file - File object from AppState
     * @param {Object} context - Additional context for enhancement
     * @returns {Object} Enhancement result
     */
    async enhance(file, context = {}) {
        if (!this.isEnabled() || !this.initialized) {
            return this.getDefaultEnhancement();
        }

        const startTime = performance.now();
        
        try {
            // Extract text content for prefix matching
            const textContent = this.extractTextContent(file, context);
            if (!textContent || textContent.length < this.minPrefixLength) {
                return this.getNoEnhancement('insufficient_content');
            }

            // Find matching prefixes
            const prefixMatches = await this.findPrefixMatches(textContent);
            if (prefixMatches.length === 0) {
                return this.getNoEnhancement('no_prefix_matches');
            }

            // Calculate enhancement based on matches
            const enhancement = this.calculateEnhancement(prefixMatches, file);
            
            // Update statistics
            this.updateStats(enhancement);
            
            return {
                enhancement: enhancement.score,
                prefixMatches: prefixMatches.length,
                topMatches: prefixMatches.slice(0, 3),
                confidence: enhancement.confidence,
                method: enhancement.method,
                fileId: file.id,
                processingTime: performance.now() - startTime,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('PrefixEnhancer: Enhancement failed', error);
            return this.getErrorEnhancement(error);
        }
    }

    /**
     * Load prefixes from Qdrant PrefixCache collection
     */
    async loadPrefixCache() {
        try {
            if (!this.qdrantService) {
                throw new Error('QdrantService not available');
            }

            // Check if PrefixCache collection exists
            const collections = await this.qdrantService.getCollections();
            const prefixCollection = collections.find(col => col.name === 'PrefixCache');
            
            if (!prefixCollection) {
                this.logger.warn('PrefixEnhancer: PrefixCache collection not found');
                return;
            }

            // Load prefixes using scroll (pagination for large dataset)
            const prefixes = [];
            let nextPageToken = null;
            let loadedCount = 0;

            do {
                const scrollResult = await this.qdrantService.scrollPoints({
                    collection: 'PrefixCache',
                    limit: 1000,
                    with_payload: true,
                    with_vector: false,
                    offset: nextPageToken
                });

                if (scrollResult.points && scrollResult.points.length > 0) {
                    prefixes.push(...scrollResult.points);
                    loadedCount += scrollResult.points.length;
                    nextPageToken = scrollResult.next_page_token;
                    
                    // Progressive loading to avoid blocking UI
                    if (loadedCount % 5000 === 0) {
                        this.logger.info(`PrefixEnhancer: Loaded ${loadedCount} prefixes...`);
                        await this.sleep(10); // Small delay to prevent blocking
                    }
                } else {
                    break;
                }

            } while (nextPageToken && loadedCount < 170000); // Safety limit

            this.stats.prefixesLoaded = prefixes.length;
            this.processPrefixes(prefixes);
            
            this.logger.info(`PrefixEnhancer: Loaded ${prefixes.length} prefixes from Qdrant`);
            
        } catch (error) {
            this.logger.error('PrefixEnhancer: Failed to load prefix cache', error);
            // Fallback to generate common prefixes
            this.generateFallbackPrefixes();
        }
    }

    /**
     * Process loaded prefixes into searchable format
     */
    processPrefixes(prefixPoints) {
        const processedPrefixes = [];
        
        for (const point of prefixPoints) {
            const payload = point.payload || {};
            
            // Extract prefix data from various possible fields
            const prefix = payload.prefix || payload.text || payload.content;
            const frequency = payload.frequency || payload.count || 1;
            const context = payload.context || payload.category || 'general';
            
            if (prefix && prefix.length >= this.minPrefixLength) {
                processedPrefixes.push({
                    id: point.id,
                    prefix: prefix.toLowerCase(),
                    frequency: frequency,
                    context: context,
                    score: payload.score || frequency
                });
            }
        }

        // Sort by frequency/score for better caching
        processedPrefixes.sort((a, b) => b.score - a.score);
        
        // Initialize LRU cache with top prefixes
        const topPrefixes = processedPrefixes.slice(0, this.maxCacheSize);
        for (const prefix of topPrefixes) {
            this.lruCache.set(prefix.prefix, prefix);
            this.cacheAccessOrder.push(prefix.prefix);
        }

        this.allPrefixes = processedPrefixes;
        this.logger.info(`PrefixEnhancer: Processed ${processedPrefixes.length} prefixes, cached top ${topPrefixes.length}`);
    }

    /**
     * Build inverted index for fast prefix lookups
     */
    async buildPrefixIndex() {
        if (!this.allPrefixes || this.allPrefixes.length === 0) {
            return;
        }

        // Build character-based inverted index
        for (const prefixData of this.allPrefixes) {
            const prefix = prefixData.prefix;
            
            // Index by first 3 characters for fast initial filtering
            for (let i = 0; i <= prefix.length - 3; i++) {
                const trigram = prefix.substring(i, i + 3);
                
                if (!this.prefixIndex.has(trigram)) {
                    this.prefixIndex.set(trigram, []);
                }
                this.prefixIndex.get(trigram).push(prefixData);
            }
        }

        this.logger.info(`PrefixEnhancer: Built index with ${this.prefixIndex.size} trigrams`);
    }

    /**
     * Find matching prefixes for given text content
     */
    async findPrefixMatches(textContent) {
        const matches = [];
        const words = textContent.toLowerCase().split(/\s+/);
        const seenPrefixes = new Set();

        for (const word of words) {
            if (word.length < this.minPrefixLength) continue;

            // Check LRU cache first
            const cachedMatch = this.getLRUCacheMatch(word);
            if (cachedMatch && !seenPrefixes.has(cachedMatch.prefix)) {
                matches.push({
                    ...cachedMatch,
                    similarity: this.calculateSimilarity(word, cachedMatch.prefix),
                    source: 'cache'
                });
                seenPrefixes.add(cachedMatch.prefix);
                this.stats.cacheHits++;
                continue;
            }

            // Search using inverted index
            const indexMatches = this.searchPrefixIndex(word);
            for (const match of indexMatches) {
                if (seenPrefixes.has(match.prefix)) continue;
                
                const similarity = this.calculateSimilarity(word, match.prefix);
                if (similarity >= this.enhancementThreshold) {
                    matches.push({
                        ...match,
                        similarity: similarity,
                        source: 'index'
                    });
                    seenPrefixes.add(match.prefix);
                    
                    // Add to LRU cache if high quality match
                    if (similarity > 0.8) {
                        this.updateLRUCache(match.prefix, match);
                    }
                }
            }

            this.stats.cacheMisses++;
        }

        // Sort by similarity and score
        matches.sort((a, b) => (b.similarity * b.score) - (a.similarity * a.score));
        
        return matches.slice(0, 20); // Limit to top 20 matches
    }

    /**
     * Calculate enhancement score based on prefix matches
     */
    calculateEnhancement(prefixMatches, file) {
        if (prefixMatches.length === 0) {
            return { score: 0, confidence: 0, method: 'no_matches' };
        }

        // Weight matches by similarity and frequency
        let totalWeight = 0;
        let weightedScore = 0;

        for (const match of prefixMatches) {
            const weight = match.similarity * Math.log(match.frequency + 1);
            totalWeight += weight;
            weightedScore += weight * match.score;
        }

        const baseEnhancement = totalWeight > 0 ? weightedScore / totalWeight : 0;
        
        // Normalize to 0-1 scale and apply max enhancement limit
        const normalizedEnhancement = Math.min(baseEnhancement / 100, 1.0);
        const finalEnhancement = normalizedEnhancement * this.maxEnhancement;

        // Apply contextual adjustments
        const contextualMultiplier = this.getContextualMultiplier(file, prefixMatches);
        const adjustedEnhancement = finalEnhancement * contextualMultiplier;

        return {
            score: Math.min(adjustedEnhancement, this.maxEnhancement),
            confidence: Math.min(totalWeight / prefixMatches.length, 1.0),
            method: 'weighted_similarity',
            baseScore: baseEnhancement,
            contextualMultiplier: contextualMultiplier
        };
    }

    /**
     * Get contextual multiplier based on file properties and match context
     */
    getContextualMultiplier(file, prefixMatches) {
        let multiplier = 1.0;

        // Boost for files with categories matching prefix contexts
        const fileCategories = (file.categories || []).map(cat => cat.toLowerCase());
        const matchContexts = prefixMatches.map(match => match.context.toLowerCase());
        const contextOverlap = fileCategories.filter(cat => 
            matchContexts.some(ctx => ctx.includes(cat) || cat.includes(ctx))
        );
        
        if (contextOverlap.length > 0) {
            multiplier *= 1.2; // 20% boost for context alignment
        }

        // Boost for high-quality matches (high similarity)
        const highQualityMatches = prefixMatches.filter(match => match.similarity > 0.8);
        if (highQualityMatches.length >= 3) {
            multiplier *= 1.15; // 15% boost for multiple high-quality matches
        }

        // Reduce for very common prefixes (avoid noise)
        const veryCommonMatches = prefixMatches.filter(match => match.frequency > 10000);
        if (veryCommonMatches.length > prefixMatches.length * 0.7) {
            multiplier *= 0.9; // 10% reduction for too many common matches
        }

        return Math.max(0.5, Math.min(1.5, multiplier)); // Clamp between 0.5 and 1.5
    }

    // Helper Methods

    /**
     * Extract text content from file for prefix matching
     */
    extractTextContent(file, context) {
        // Try different content sources
        const sources = [
            file.content,
            file.preview,
            context.content,
            context.preview,
            file.name,
            file.path
        ].filter(Boolean);

        if (sources.length === 0) return '';

        // Combine and clean text content
        const combinedText = sources.join(' ');
        return combinedText
            .replace(/[^\w\s]/g, ' ') // Remove special characters
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim();
    }

    /**
     * Search prefix index using trigrams
     */
    searchPrefixIndex(word) {
        const candidates = new Map();
        
        // Generate trigrams for the word
        for (let i = 0; i <= word.length - 3; i++) {
            const trigram = word.substring(i, i + 3);
            const indexMatches = this.prefixIndex.get(trigram) || [];
            
            for (const match of indexMatches) {
                const key = match.prefix;
                candidates.set(key, match);
            }
        }

        return Array.from(candidates.values());
    }

    /**
     * Calculate similarity between two strings
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        
        // Use Jaccard similarity for efficiency
        const set1 = new Set(str1.toLowerCase());
        const set2 = new Set(str2.toLowerCase());
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    /**
     * LRU cache management
     */
    getLRUCacheMatch(word) {
        for (const [prefix, data] of this.lruCache.entries()) {
            if (word.includes(prefix) || prefix.includes(word)) {
                // Move to end (most recently used)
                this.updateLRUCache(prefix, data);
                return data;
            }
        }
        return null;
    }

    updateLRUCache(prefix, data) {
        // Remove if exists
        if (this.lruCache.has(prefix)) {
            const index = this.cacheAccessOrder.indexOf(prefix);
            if (index > -1) {
                this.cacheAccessOrder.splice(index, 1);
            }
        }

        // Add to end
        this.lruCache.set(prefix, data);
        this.cacheAccessOrder.push(prefix);

        // Evict if over capacity
        if (this.lruCache.size > this.maxCacheSize) {
            const oldest = this.cacheAccessOrder.shift();
            this.lruCache.delete(oldest);
        }
    }

    /**
     * Update statistics
     */
    updateStats(enhancement) {
        this.stats.enhancements++;
        this.stats.avgEnhancement = 
            (this.stats.avgEnhancement * (this.stats.enhancements - 1) + enhancement.score) / 
            this.stats.enhancements;
        
        // Calculate prefix utilization
        const usedPrefixes = this.lruCache.size;
        const totalPrefixes = this.stats.prefixesLoaded;
        this.stats.prefixUtilization = totalPrefixes > 0 ? usedPrefixes / totalPrefixes : 0;
    }

    /**
     * Utility methods
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isEnabled() {
        return this.featureFlags?.isEnabled('prefix_enhancement_enabled') !== false;
    }

    getDefaultEnhancement() {
        return {
            enhancement: 0,
            reason: 'PrefixEnhancer disabled or not initialized'
        };
    }

    getNoEnhancement(reason) {
        return {
            enhancement: 0,
            prefixMatches: 0,
            reason: reason
        };
    }

    getErrorEnhancement(error) {
        return {
            enhancement: 0,
            error: error.message,
            reason: 'Enhancement calculation failed'
        };
    }

    /**
     * Generate fallback prefixes if Qdrant loading fails
     */
    generateFallbackPrefixes() {
        const commonPrefixes = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out',
            'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
            'did', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ago', 'any', 'ask', 'car', 'cut', 'let',
            'man', 'own', 'put', 'say', 'she', 'too', 'use', 'way', 'win', 'yes', 'yet', 'big', 'box', 'end', 'got'
        ];

        this.allPrefixes = commonPrefixes.map((prefix, index) => ({
            id: index,
            prefix: prefix,
            frequency: 100 - index,
            context: 'common',
            score: 100 - index
        }));

        this.stats.prefixesLoaded = commonPrefixes.length;
        this.buildPrefixIndex();
        
        this.logger.warn(`PrefixEnhancer: Using ${commonPrefixes.length} fallback prefixes`);
    }

    /**
     * Get enhancer statistics
     */
    getCacheStats() {
        return {
            lruCacheSize: this.lruCache.size,
            maxCacheSize: this.maxCacheSize,
            hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
            indexSize: this.prefixIndex.size
        };
    }

    getPrefixUtilization() {
        return {
            utilization: this.stats.prefixUtilization,
            totalPrefixes: this.stats.prefixesLoaded,
            activePrefixes: this.lruCache.size,
            averageEnhancement: this.stats.avgEnhancement
        };
    }

    /**
     * Console commands registration
     */
    registerConsoleCommands() {
        if (typeof window !== 'undefined') {
            window.kcprefix = {
                enhance: (file) => this.enhance(file),
                stats: () => this.stats,
                cacheStats: () => this.getCacheStats(),
                prefixUtilization: () => this.getPrefixUtilization(),
                clearCache: () => {
                    this.lruCache.clear();
                    this.cacheAccessOrder = [];
                    return 'LRU cache cleared';
                },
                reinitialize: () => this.initializeAsync()
            };
        }
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.PrefixEnhancer = PrefixEnhancer;

// Auto-initialize if dependencies are available
if (window.KC?.FeatureFlagManagerInstance && window.KC?.QdrantService) {
    window.KC.PrefixEnhancerInstance = new PrefixEnhancer();
    
    // Add feature flag for prefix enhancement
    window.KC.FeatureFlagManagerInstance.flags.set('prefix_enhancement_enabled', {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable prefix-based confidence enhancement'
    });
}

export default PrefixEnhancer;
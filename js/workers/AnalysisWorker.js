/**
 * AnalysisWorker.js - Web Worker for Analysis Processing
 * 
 * Offloads heavy analysis processing to a Web Worker to prevent UI blocking.
 * Features:
 * - Background analysis processing
 * - Request batching for API calls
 * - Intelligent caching strategies
 * - Pipeline optimization
 * 
 * @version 1.0.0
 * @author Claude Code Performance Team
 */

// Worker scope - no window object available
console.log('🔄 AnalysisWorker: Starting Web Worker...');

/**
 * Worker State
 */
const workerState = {
    config: {
        batchSize: 5,               // Files to process per batch
        maxConcurrent: 2,           // Max concurrent API requests
        cacheExpiry: 30 * 60 * 1000, // 30 minutes cache
        retryAttempts: 3,           // Retry failed requests
        retryDelay: 1000            // Base retry delay in ms
    },
    cache: new Map(),               // Analysis results cache
    requestQueue: [],               // Pending analysis requests
    activeRequests: new Set(),      // Currently processing requests
    lastActivity: Date.now(),       // Last activity timestamp
    statistics: {
        processed: 0,
        cached: 0,
        failed: 0,
        totalTime: 0
    }
};

/**
 * Message Handler
 * Processes messages from main thread
 */
self.onmessage = function(event) {
    const { type, payload, id } = event.data;
    
    try {
        switch (type) {
            case 'ANALYZE_FILES':
                handleAnalyzeFiles(payload, id);
                break;
                
            case 'BATCH_ANALYZE':
                handleBatchAnalyze(payload, id);
                break;
                
            case 'GET_CACHE_STATS':
                sendResponse(id, 'CACHE_STATS', getCacheStats());
                break;
                
            case 'CLEAR_CACHE':
                clearCache();
                sendResponse(id, 'CACHE_CLEARED', { success: true });
                break;
                
            case 'UPDATE_CONFIG':
                updateConfig(payload);
                sendResponse(id, 'CONFIG_UPDATED', { success: true });
                break;
                
            case 'GET_QUEUE_STATUS':
                sendResponse(id, 'QUEUE_STATUS', getQueueStatus());
                break;
                
            case 'CANCEL_ANALYSIS':
                cancelAnalysis(payload.requestId);
                sendResponse(id, 'ANALYSIS_CANCELLED', { success: true });
                break;
                
            default:
                console.warn('AnalysisWorker: Unknown message type:', type);
                sendError(id, `Unknown message type: ${type}`);
        }
    } catch (error) {
        console.error('AnalysisWorker: Error processing message:', error);
        sendError(id, error.message);
    }
};

/**
 * Handle file analysis request
 */
async function handleAnalyzeFiles(files, requestId) {
    console.log(`🔄 AnalysisWorker: Analyzing ${files.length} files...`);
    
    const startTime = Date.now();
    const results = [];
    const errors = [];
    
    try {
        // Check cache first
        const { cached, uncached } = separateCachedFiles(files);
        
        // Add cached results immediately
        cached.forEach(file => {
            const cachedResult = workerState.cache.get(getCacheKey(file));
            results.push({
                fileId: file.id,
                result: cachedResult,
                fromCache: true
            });
        });
        
        // Process uncached files
        if (uncached.length > 0) {
            const analysisResults = await processFilesInBatches(uncached, requestId);
            results.push(...analysisResults.results);
            errors.push(...analysisResults.errors);
        }
        
        const processingTime = Date.now() - startTime;
        workerState.statistics.totalTime += processingTime;
        workerState.statistics.processed += files.length;
        workerState.statistics.cached += cached.length;
        
        sendResponse(requestId, 'ANALYSIS_COMPLETE', {
            results,
            errors,
            statistics: {
                totalFiles: files.length,
                cachedFiles: cached.length,
                processedFiles: uncached.length,
                processingTime,
                errors: errors.length
            }
        });
        
    } catch (error) {
        console.error('AnalysisWorker: Analysis failed:', error);
        workerState.statistics.failed += files.length;
        sendError(requestId, error.message);
    }
}

/**
 * Handle batch analysis with optimized processing
 */
async function handleBatchAnalyze(payload, requestId) {
    const { files, config = {} } = payload;
    
    // Merge with worker config
    const batchConfig = { ...workerState.config, ...config };
    
    console.log(`🔄 AnalysisWorker: Batch analyzing ${files.length} files with batch size ${batchConfig.batchSize}`);
    
    const startTime = Date.now();
    let totalProcessed = 0;
    
    try {
        // Process in optimized batches
        const batches = createOptimizedBatches(files, batchConfig);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            
            // Send progress update
            sendProgress(requestId, {
                batchIndex: i + 1,
                totalBatches: batches.length,
                filesInBatch: batch.length,
                totalProcessed,
                totalFiles: files.length
            });
            
            // Process batch
            const batchResults = await processBatch(batch, batchConfig);
            totalProcessed += batch.length;
            
            // Send batch results immediately
            sendResponse(requestId, 'BATCH_PROGRESS', {
                batchIndex: i + 1,
                results: batchResults.results,
                errors: batchResults.errors,
                totalProcessed
            });
            
            // Brief pause between batches to prevent overwhelming
            if (i < batches.length - 1) {
                await sleep(100);
            }
        }
        
        const totalTime = Date.now() - startTime;
        
        sendResponse(requestId, 'BATCH_COMPLETE', {
            totalFiles: files.length,
            totalProcessed,
            totalTime,
            averageTimePerFile: totalTime / totalProcessed
        });
        
    } catch (error) {
        console.error('AnalysisWorker: Batch analysis failed:', error);
        sendError(requestId, error.message);
    }
}

/**
 * Separate files into cached and uncached
 */
function separateCachedFiles(files) {
    const cached = [];
    const uncached = [];
    
    files.forEach(file => {
        const cacheKey = getCacheKey(file);
        const cachedResult = workerState.cache.get(cacheKey);
        
        if (cachedResult && !isCacheExpired(cachedResult)) {
            cached.push(file);
        } else {
            uncached.push(file);
        }
    });
    
    return { cached, uncached };
}

/**
 * Process files in batches with concurrency control
 */
async function processFilesInBatches(files, requestId) {
    const batches = createBatches(files, workerState.config.batchSize);
    const allResults = [];
    const allErrors = [];
    
    for (const batch of batches) {
        try {
            const batchResult = await processBatch(batch, workerState.config);
            allResults.push(...batchResult.results);
            allErrors.push(...batchResult.errors);
        } catch (error) {
            console.error('AnalysisWorker: Batch processing failed:', error);
            // Continue with next batch
            batch.forEach(file => {
                allErrors.push({
                    fileId: file.id,
                    error: error.message
                });
            });
        }
    }
    
    return { results: allResults, errors: allErrors };
}

/**
 * Process a single batch of files
 */
async function processBatch(files, config) {
    const results = [];
    const errors = [];
    
    // Create analysis promises with concurrency limit
    const analysisPromises = files.map(file => 
        limitConcurrency(() => analyzeFile(file), config.maxConcurrent)
    );
    
    // Wait for all analyses to complete
    const settledResults = await Promise.allSettled(analysisPromises);
    
    settledResults.forEach((result, index) => {
        const file = files[index];
        
        if (result.status === 'fulfilled') {
            results.push({
                fileId: file.id,
                result: result.value,
                fromCache: false
            });
            
            // Cache the result
            cacheAnalysisResult(file, result.value);
        } else {
            errors.push({
                fileId: file.id,
                error: result.reason?.message || 'Unknown error'
            });
        }
    });
    
    return { results, errors };
}

/**
 * Analyze a single file
 */
async function analyzeFile(file) {
    const startTime = Date.now();
    
    try {
        // Simulate analysis - in real implementation, this would call AI APIs
        const analysisResult = await performAnalysis(file);
        
        const processingTime = Date.now() - startTime;
        
        return {
            ...analysisResult,
            processingTime,
            timestamp: Date.now()
        };
        
    } catch (error) {
        console.error(`AnalysisWorker: Failed to analyze file ${file.id}:`, error);
        throw error;
    }
}

/**
 * Perform the actual analysis (placeholder)
 * In real implementation, this would make API calls to AI services
 */
async function performAnalysis(file) {
    // Simulate API delay
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    await sleep(delay);
    
    // Simulate analysis result
    return {
        analysisType: determineAnalysisType(file),
        relevanceScore: calculateRelevanceScore(file),
        insights: extractInsights(file),
        confidence: Math.random() * 0.3 + 0.7, // 70-100%
        keyPoints: generateKeyPoints(file),
        summary: generateSummary(file)
    };
}

/**
 * Determine analysis type based on file content
 */
function determineAnalysisType(file) {
    const content = file.preview || file.content || '';
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('breakthrough') || contentLower.includes('innovation')) {
        return 'Technical Breakthrough';
    } else if (contentLower.includes('decision') || contentLower.includes('strategy')) {
        return 'Strategic Decision';
    } else if (contentLower.includes('insight') || contentLower.includes('learning')) {
        return 'Learning Insight';
    } else if (contentLower.includes('concept') || contentLower.includes('evolution')) {
        return 'Conceptual Evolution';
    } else {
        return 'General Learning';
    }
}

/**
 * Calculate relevance score
 */
function calculateRelevanceScore(file) {
    const content = file.preview || file.content || '';
    const keywords = ['decision', 'insight', 'breakthrough', 'learning', 'strategy', 'innovation'];
    
    let score = 20; // Base score
    
    keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex) || [];
        score += matches.length * 15;
    });
    
    // File size factor
    if (file.size && file.size > 1000) {
        score += 10;
    }
    
    // Categories boost
    if (file.categories && file.categories.length > 0) {
        score += file.categories.length * 5;
    }
    
    return Math.min(100, score);
}

/**
 * Extract insights from file content
 */
function extractInsights(file) {
    const content = file.preview || file.content || '';
    const insights = [];
    
    // Look for decision patterns
    const decisionPattern = /(decided|chose|concluded|determined)[^.]*\./gi;
    const decisions = content.match(decisionPattern) || [];
    decisions.forEach(decision => {
        insights.push({
            type: 'decision',
            text: decision.trim(),
            confidence: 0.8
        });
    });
    
    // Look for learning patterns
    const learningPattern = /(learned|discovered|realized|understood)[^.]*\./gi;
    const learnings = content.match(learningPattern) || [];
    learnings.forEach(learning => {
        insights.push({
            type: 'learning',
            text: learning.trim(),
            confidence: 0.7
        });
    });
    
    return insights.slice(0, 5); // Limit to top 5 insights
}

/**
 * Generate key points
 */
function generateKeyPoints(file) {
    const content = file.preview || file.content || '';
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Score sentences by keyword density
    const keywordScores = sentences.map(sentence => {
        const keywords = ['important', 'key', 'critical', 'essential', 'main', 'primary'];
        let score = 0;
        
        keywords.forEach(keyword => {
            if (sentence.toLowerCase().includes(keyword)) {
                score += 1;
            }
        });
        
        return { sentence: sentence.trim(), score };
    });
    
    // Return top scored sentences
    return keywordScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.sentence);
}

/**
 * Generate summary
 */
function generateSummary(file) {
    const content = file.preview || file.content || '';
    const words = content.split(/\s+/).slice(0, 50); // First 50 words
    return words.join(' ') + (content.length > words.join(' ').length ? '...' : '');
}

/**
 * Create optimized batches based on file characteristics
 */
function createOptimizedBatches(files, config) {
    // Sort files by estimated processing time (size as proxy)
    const sortedFiles = [...files].sort((a, b) => (b.size || 0) - (a.size || 0));
    
    // Create balanced batches
    const batches = [];
    let currentBatch = [];
    let currentBatchSize = 0;
    
    sortedFiles.forEach(file => {
        const estimatedSize = file.size || 1000;
        
        if (currentBatch.length >= config.batchSize || 
            (currentBatchSize > 0 && currentBatchSize + estimatedSize > config.batchSize * 2000)) {
            batches.push(currentBatch);
            currentBatch = [];
            currentBatchSize = 0;
        }
        
        currentBatch.push(file);
        currentBatchSize += estimatedSize;
    });
    
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }
    
    return batches;
}

/**
 * Create simple batches
 */
function createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
}

/**
 * Limit concurrent operations
 */
const concurrencyLimiter = (() => {
    let running = 0;
    const queue = [];
    
    return async function limitConcurrency(fn, maxConcurrent) {
        return new Promise((resolve, reject) => {
            const task = async () => {
                running++;
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    running--;
                    if (queue.length > 0 && running < maxConcurrent) {
                        const nextTask = queue.shift();
                        nextTask();
                    }
                }
            };
            
            if (running < maxConcurrent) {
                task();
            } else {
                queue.push(task);
            }
        });
    };
})();

/**
 * Cache management
 */
function getCacheKey(file) {
    const contentHash = simpleHash(file.preview || file.content || '');
    return `${file.id}_${file.lastModified || 0}_${contentHash}`;
}

function cacheAnalysisResult(file, result) {
    const cacheKey = getCacheKey(file);
    workerState.cache.set(cacheKey, {
        ...result,
        cachedAt: Date.now()
    });
    
    // Cleanup old cache entries periodically
    if (workerState.cache.size > 1000) {
        cleanupCache();
    }
}

function isCacheExpired(cachedResult) {
    return Date.now() - cachedResult.cachedAt > workerState.config.cacheExpiry;
}

function cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    workerState.cache.forEach((value, key) => {
        if (now - value.cachedAt > workerState.config.cacheExpiry) {
            expiredKeys.push(key);
        }
    });
    
    expiredKeys.forEach(key => workerState.cache.delete(key));
    
    console.log(`AnalysisWorker: Cleaned up ${expiredKeys.length} expired cache entries`);
}

function clearCache() {
    workerState.cache.clear();
    console.log('AnalysisWorker: Cache cleared');
}

function getCacheStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    
    workerState.cache.forEach(value => {
        if (now - value.cachedAt > workerState.config.cacheExpiry) {
            expired++;
        } else {
            valid++;
        }
    });
    
    return {
        total: workerState.cache.size,
        valid,
        expired,
        statistics: workerState.statistics
    };
}

/**
 * Configuration management
 */
function updateConfig(newConfig) {
    Object.assign(workerState.config, newConfig);
    console.log('AnalysisWorker: Config updated:', workerState.config);
}

/**
 * Queue management
 */
function getQueueStatus() {
    return {
        pending: workerState.requestQueue.length,
        active: workerState.activeRequests.size,
        lastActivity: workerState.lastActivity
    };
}

function cancelAnalysis(requestId) {
    // Remove from queue if pending
    workerState.requestQueue = workerState.requestQueue.filter(req => req.id !== requestId);
    
    // Mark as cancelled if active
    workerState.activeRequests.delete(requestId);
    
    console.log(`AnalysisWorker: Analysis ${requestId} cancelled`);
}

/**
 * Utility functions
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
}

/**
 * Communication helpers
 */
function sendResponse(id, type, payload) {
    self.postMessage({
        id,
        type,
        payload,
        timestamp: Date.now()
    });
}

function sendError(id, message) {
    self.postMessage({
        id,
        type: 'ERROR',
        error: message,
        timestamp: Date.now()
    });
}

function sendProgress(id, progress) {
    self.postMessage({
        id,
        type: 'PROGRESS',
        payload: progress,
        timestamp: Date.now()
    });
}

// Worker cleanup on termination
self.onclose = function() {
    console.log('AnalysisWorker: Worker terminated');
    clearCache();
};

console.log('✅ AnalysisWorker: Web Worker initialized and ready');
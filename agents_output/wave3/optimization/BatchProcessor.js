/**
 * BatchProcessor - Parallel Batch Processing Engine
 * 
 * Efficiently processes large batches of items with:
 * - Concurrent execution with configurable limits
 * - Automatic batching and chunking
 * - Retry logic for failed items
 * - Progress tracking and reporting
 * - Resource-aware scheduling
 * - Graceful error handling
 * 
 * Performance features:
 * - Process 100+ items concurrently
 * - Adaptive batch sizing based on performance
 * - Memory-efficient streaming
 */

import PerformanceMonitor from './PerformanceMonitor.js';

export default class BatchProcessor {
    constructor(config = {}) {
        this.config = {
            maxConcurrent: config.maxConcurrent || 20,
            batchSize: config.batchSize || 10,
            timeout: config.timeout || 10000,
            retryAttempts: config.retryAttempts || 2,
            retryDelay: config.retryDelay || 1000,
            adaptiveBatching: config.adaptiveBatching !== false,
            resourceMonitoring: config.resourceMonitoring !== false,
            progressCallback: config.progressCallback || null
        };
        
        // Processing state
        this.activeProcesses = new Set();
        this.processingQueue = [];
        this.results = new Map();
        
        // Performance tracking
        this.performanceMonitor = new PerformanceMonitor('BatchProcessor');
        this.performanceHistory = [];
        this.maxHistorySize = 100;
        
        // Adaptive batching
        this.currentBatchSize = this.config.batchSize;
        this.adaptiveStats = {
            successRate: 1.0,
            avgProcessingTime: 0,
            memoryPressure: 0
        };
        
        // Statistics
        this.stats = {
            totalProcessed: 0,
            totalFailed: 0,
            totalRetries: 0,
            currentActive: 0,
            queueLength: 0,
            avgBatchTime: 0,
            throughput: 0
        };
    }
    
    /**
     * Process batch of items
     * @param {array} items - Items to process
     * @param {function} processor - Processing function
     * @param {object} options - Processing options
     * @returns {Promise<array>} Processed results
     */
    async process(items, processor, options = {}) {
        const timer = this.performanceMonitor.startTimer('processBatch');
        const batchId = Date.now();
        
        try {
            // Merge options with config
            const config = { ...this.config, ...options };
            
            // Clear previous results
            this.results.clear();
            
            // Create processing chunks
            const chunks = this.createChunks(items, this.currentBatchSize);
            const totalChunks = chunks.length;
            
            console.log(`BatchProcessor: Processing ${items.length} items in ${totalChunks} chunks`);
            
            // Process chunks with concurrency control
            const results = await this.processChunks(chunks, processor, config, batchId);
            
            // Update statistics
            this.updateStats(timer.elapsed(), items.length);
            
            // Adapt batch size if enabled
            if (this.config.adaptiveBatching) {
                this.adaptBatchSize();
            }
            
            timer.end();
            return results;
            
        } catch (error) {
            timer.end();
            this.performanceMonitor.recordError('processBatch', error);
            throw error;
        }
    }
    
    /**
     * Process chunks with concurrency control
     * @private
     */
    async processChunks(chunks, processor, config, batchId) {
        const results = [];
        let processedChunks = 0;
        
        // Process chunks with controlled concurrency
        for (let i = 0; i < chunks.length; i += config.maxConcurrent) {
            const batch = chunks.slice(i, i + config.maxConcurrent);
            
            // Wait for available slots
            await this.waitForCapacity(config.maxConcurrent);
            
            // Process batch concurrently
            const batchPromises = batch.map((chunk, index) => 
                this.processChunk(
                    chunk, 
                    processor, 
                    config,
                    i + index,
                    chunks.length,
                    batchId
                )
            );
            
            // Wait for batch completion
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Collect results
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(...result.value);
                } else {
                    console.error('BatchProcessor: Chunk processing failed', result.reason);
                }
            }
            
            processedChunks += batch.length;
            
            // Report progress
            if (config.progressCallback) {
                config.progressCallback({
                    processed: processedChunks,
                    total: chunks.length,
                    percentage: (processedChunks / chunks.length) * 100
                });
            }
        }
        
        return results;
    }
    
    /**
     * Process single chunk
     * @private
     */
    async processChunk(chunk, processor, config, chunkIndex, totalChunks, batchId) {
        const chunkTimer = this.performanceMonitor.startTimer(`chunk_${chunkIndex}`);
        const processId = `${batchId}_${chunkIndex}`;
        
        try {
            // Register active process
            this.activeProcesses.add(processId);
            this.stats.currentActive = this.activeProcesses.size;
            
            // Process items in chunk
            const results = await this.processItems(chunk, processor, config);
            
            // Store results
            this.results.set(chunkIndex, results);
            
            // Update progress
            const progress = ((chunkIndex + 1) / totalChunks) * 100;
            console.debug(`BatchProcessor: Chunk ${chunkIndex + 1}/${totalChunks} completed (${progress.toFixed(1)}%)`);
            
            chunkTimer.end();
            return results;
            
        } finally {
            // Unregister active process
            this.activeProcesses.delete(processId);
            this.stats.currentActive = this.activeProcesses.size;
        }
    }
    
    /**
     * Process individual items with retry
     * @private
     */
    async processItems(items, processor, config) {
        const results = [];
        
        for (const item of items) {
            let attempts = 0;
            let lastError = null;
            
            while (attempts <= config.retryAttempts) {
                try {
                    // Create timeout promise
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Processing timeout')), config.timeout);
                    });
                    
                    // Race between processor and timeout
                    const result = await Promise.race([
                        processor(item),
                        timeoutPromise
                    ]);
                    
                    this.stats.totalProcessed++;
                    results.push(result);
                    break;
                    
                } catch (error) {
                    lastError = error;
                    attempts++;
                    
                    if (attempts <= config.retryAttempts) {
                        this.stats.totalRetries++;
                        console.warn(`BatchProcessor: Retry ${attempts}/${config.retryAttempts} for item`, error.message);
                        
                        // Exponential backoff
                        await this.delay(config.retryDelay * Math.pow(2, attempts - 1));
                    }
                }
            }
            
            // If all retries failed
            if (attempts > config.retryAttempts) {
                this.stats.totalFailed++;
                console.error('BatchProcessor: Item processing failed after retries', lastError);
                
                // Return error result
                results.push({
                    error: lastError.message,
                    item: item,
                    failed: true
                });
            }
        }
        
        return results;
    }
    
    /**
     * Create chunks from items
     * @private
     */
    createChunks(items, chunkSize) {
        const chunks = [];
        
        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }
        
        return chunks;
    }
    
    /**
     * Wait for processing capacity
     * @private
     */
    async waitForCapacity(maxConcurrent) {
        while (this.activeProcesses.size >= maxConcurrent) {
            await this.delay(100);
            
            // Check for resource pressure
            if (this.config.resourceMonitoring) {
                const pressure = this.checkResourcePressure();
                if (pressure > 0.8) {
                    await this.delay(500); // Additional delay under pressure
                }
            }
        }
    }
    
    /**
     * Check resource pressure
     * @private
     */
    checkResourcePressure() {
        if (!performance.memory) return 0;
        
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        this.adaptiveStats.memoryPressure = memoryUsage;
        
        return memoryUsage;
    }
    
    /**
     * Adapt batch size based on performance
     * @private
     */
    adaptBatchSize() {
        // Calculate performance metrics
        const recentHistory = this.performanceHistory.slice(-10);
        if (recentHistory.length < 5) return;
        
        const avgTime = recentHistory.reduce((sum, h) => sum + h.time, 0) / recentHistory.length;
        const successRate = recentHistory.reduce((sum, h) => sum + h.successRate, 0) / recentHistory.length;
        
        // Update adaptive stats
        this.adaptiveStats.avgProcessingTime = avgTime;
        this.adaptiveStats.successRate = successRate;
        
        // Adjust batch size
        if (successRate < 0.9 || this.adaptiveStats.memoryPressure > 0.7) {
            // Decrease batch size
            this.currentBatchSize = Math.max(1, Math.floor(this.currentBatchSize * 0.8));
        } else if (successRate > 0.95 && avgTime < 1000 && this.adaptiveStats.memoryPressure < 0.5) {
            // Increase batch size
            this.currentBatchSize = Math.min(50, Math.floor(this.currentBatchSize * 1.2));
        }
        
        console.log(`BatchProcessor: Adapted batch size to ${this.currentBatchSize}`);
    }
    
    /**
     * Update statistics
     * @private
     */
    updateStats(elapsedTime, itemCount) {
        // Calculate throughput
        this.stats.throughput = itemCount / (elapsedTime / 1000);
        
        // Update average batch time
        const batchTime = elapsedTime / Math.ceil(itemCount / this.currentBatchSize);
        if (this.stats.avgBatchTime === 0) {
            this.stats.avgBatchTime = batchTime;
        } else {
            this.stats.avgBatchTime = (this.stats.avgBatchTime * 0.9) + (batchTime * 0.1);
        }
        
        // Record performance history
        const successRate = this.stats.totalProcessed / (this.stats.totalProcessed + this.stats.totalFailed);
        this.performanceHistory.push({
            time: elapsedTime,
            itemCount,
            successRate,
            batchSize: this.currentBatchSize,
            timestamp: Date.now()
        });
        
        // Maintain history size
        if (this.performanceHistory.length > this.maxHistorySize) {
            this.performanceHistory.shift();
        }
    }
    
    /**
     * Process stream of items
     * @param {AsyncIterable} stream - Stream of items
     * @param {function} processor - Processing function
     * @param {object} options - Processing options
     * @returns {AsyncGenerator} Stream of results
     */
    async *processStream(stream, processor, options = {}) {
        const config = { ...this.config, ...options };
        const buffer = [];
        
        for await (const item of stream) {
            buffer.push(item);
            
            // Process when buffer reaches batch size
            if (buffer.length >= this.currentBatchSize) {
                const batch = buffer.splice(0, this.currentBatchSize);
                const results = await this.process(batch, processor, config);
                
                for (const result of results) {
                    yield result;
                }
            }
        }
        
        // Process remaining items
        if (buffer.length > 0) {
            const results = await this.process(buffer, processor, config);
            
            for (const result of results) {
                yield result;
            }
        }
    }
    
    /**
     * Cancel active processing
     */
    cancel() {
        // Clear active processes
        this.activeProcesses.clear();
        this.stats.currentActive = 0;
        
        // Clear queue
        this.processingQueue = [];
        this.stats.queueLength = 0;
        
        console.log('BatchProcessor: Processing cancelled');
    }
    
    /**
     * Delay helper
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get processing statistics
     * @returns {object} Processing stats
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalProcessed > 0 ?
                (this.stats.totalProcessed / (this.stats.totalProcessed + this.stats.totalFailed) * 100).toFixed(2) + '%' :
                '0%',
            currentBatchSize: this.currentBatchSize,
            adaptiveStats: this.adaptiveStats,
            performanceHistory: this.performanceHistory.slice(-10)
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalProcessed: 0,
            totalFailed: 0,
            totalRetries: 0,
            currentActive: 0,
            queueLength: 0,
            avgBatchTime: 0,
            throughput: 0
        };
        
        this.performanceHistory = [];
        this.currentBatchSize = this.config.batchSize;
    }
}
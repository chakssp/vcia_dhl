/**
 * BatchOperations - Batch API Operations Management
 * 
 * Handles batch processing of files, analysis operations, and API calls
 * Provides progress tracking, cancellation support, and rate limiting
 * 
 * @version 2.0.0
 * @author Knowledge Consolidator Team
 */

class BatchOperations {
    constructor(options = {}) {
        this.options = {
            defaultBatchSize: options.defaultBatchSize || 10,
            maxConcurrency: options.maxConcurrency || 3,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            progressUpdateInterval: options.progressUpdateInterval || 100,
            timeoutPerOperation: options.timeoutPerOperation || 30000,
            rateLimit: {
                requestsPerMinute: options.rateLimit?.requestsPerMinute || 60,
                requestsPerHour: options.rateLimit?.requestsPerHour || 1000
            },
            enablePersistence: options.enablePersistence !== false,
            ...options
        };

        // Batch management
        this.activeBatches = new Map();
        this.batchHistory = [];
        this.operationQueue = [];
        this.processingQueue = false;

        // Rate limiting
        this.rateLimiter = {
            minuteWindow: [],
            hourWindow: [],
            lastCleanup: Date.now()
        };

        // Statistics
        this.stats = {
            totalBatches: 0,
            successfulBatches: 0,
            failedBatches: 0,
            cancelledBatches: 0,
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            totalProcessingTime: 0,
            avgBatchSize: 0,
            avgProcessingTime: 0
        };

        // Event handling
        this.eventHandlers = new Map();

        this._initializeRateLimit();
    }

    /**
     * Initialize the batch operations service
     */
    async initialize() {
        try {
            await this._loadPersistedBatches();
            this._startRateLimitCleanup();
            
            this._emit('batch:initialized', { service: 'BatchOperations' });
            return { success: true, message: 'BatchOperations service initialized' };
        } catch (error) {
            this._emit('batch:initialization_failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Create and execute a batch operation
     */
    async createBatch(operations, options = {}) {
        const batchId = this._generateBatchId();
        const batchConfig = {
            id: batchId,
            operations: Array.isArray(operations) ? operations : [operations],
            batchSize: options.batchSize || this.options.defaultBatchSize,
            concurrency: Math.min(options.concurrency || this.options.maxConcurrency, this.options.maxConcurrency),
            priority: options.priority || 'normal',
            retryAttempts: options.retryAttempts || this.options.retryAttempts,
            timeout: options.timeout || this.options.timeoutPerOperation,
            metadata: options.metadata || {},
            createdAt: Date.now(),
            status: 'created'
        };

        // Validate rate limits
        if (!this._checkRateLimit(batchConfig.operations.length)) {
            throw new Error('Rate limit exceeded. Please wait before creating new batches.');
        }

        const batch = new BatchOperation(batchConfig, this);
        this.activeBatches.set(batchId, batch);
        this.stats.totalBatches++;

        this._emit('batch:created', {
            batchId,
            operationCount: batchConfig.operations.length,
            priority: batchConfig.priority
        });

        // Auto-start if requested
        if (options.autoStart !== false) {
            await this.startBatch(batchId);
        }

        return batch;
    }

    /**
     * Start batch processing
     */
    async startBatch(batchId) {
        const batch = this.activeBatches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        if (batch.status !== 'created' && batch.status !== 'paused') {
            throw new Error(`Batch ${batchId} cannot be started. Current status: ${batch.status}`);
        }

        try {
            await batch.start();
            return { success: true, batchId, status: batch.status };
        } catch (error) {
            this._emit('batch:start_failed', { batchId, error: error.message });
            throw error;
        }
    }

    /**
     * Pause batch processing
     */
    async pauseBatch(batchId) {
        const batch = this.activeBatches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        await batch.pause();
        
        this._emit('batch:paused', { batchId });
        return { success: true, batchId, status: batch.status };
    }

    /**
     * Cancel batch processing
     */
    async cancelBatch(batchId, reason = 'User requested') {
        const batch = this.activeBatches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        await batch.cancel(reason);
        this.stats.cancelledBatches++;
        
        this._emit('batch:cancelled', { batchId, reason });
        return { success: true, batchId, status: batch.status };
    }

    /**
     * Get batch status and progress
     */
    getBatchStatus(batchId) {
        const batch = this.activeBatches.get(batchId);
        if (!batch) {
            // Check in history
            const historicalBatch = this.batchHistory.find(b => b.id === batchId);
            if (historicalBatch) {
                return {
                    found: true,
                    historical: true,
                    ...historicalBatch
                };
            }
            return { found: false };
        }

        return {
            found: true,
            historical: false,
            ...batch.getStatus()
        };
    }

    /**
     * Get all active batches
     */
    getActiveBatches() {
        return Array.from(this.activeBatches.values()).map(batch => batch.getStatus());
    }

    /**
     * Create file analysis batch
     */
    async createFileAnalysisBatch(files, analysisOptions = {}) {
        const operations = files.map(file => ({
            type: 'analyze_file',
            target: file,
            options: {
                template: analysisOptions.template || 'decisiveMoments',
                provider: analysisOptions.provider || 'ollama',
                ...analysisOptions
            }
        }));

        return this.createBatch(operations, {
            batchSize: 5, // Smaller batches for AI operations
            concurrency: 2, // Limit concurrent AI requests
            metadata: {
                type: 'file_analysis',
                fileCount: files.length,
                template: analysisOptions.template
            }
        });
    }

    /**
     * Create embedding generation batch
     */
    async createEmbeddingBatch(texts, embeddingOptions = {}) {
        const operations = texts.map((text, index) => ({
            type: 'generate_embedding',
            target: text,
            options: {
                model: embeddingOptions.model || 'nomic-embed-text',
                dimensions: embeddingOptions.dimensions || 768,
                index,
                ...embeddingOptions
            }
        }));

        return this.createBatch(operations, {
            batchSize: 20, // Larger batches for embeddings
            concurrency: 3,
            metadata: {
                type: 'embedding_generation',
                textCount: texts.length,
                model: embeddingOptions.model
            }
        });
    }

    /**
     * Create Qdrant upload batch
     */
    async createQdrantUploadBatch(points, uploadOptions = {}) {
        // Split points into manageable chunks
        const chunks = this._chunkArray(points, uploadOptions.chunkSize || 100);
        
        const operations = chunks.map((chunk, index) => ({
            type: 'upload_to_qdrant',
            target: chunk,
            options: {
                collection: uploadOptions.collection || 'knowledge_base',
                chunkIndex: index,
                totalChunks: chunks.length,
                ...uploadOptions
            }
        }));

        return this.createBatch(operations, {
            batchSize: 5, // Conservative for vector DB uploads
            concurrency: 2,
            metadata: {
                type: 'qdrant_upload',
                pointCount: points.length,
                chunkCount: chunks.length,
                collection: uploadOptions.collection
            }
        });
    }

    /**
     * Create file processing pipeline batch
     */
    async createProcessingPipelineBatch(files, pipelineOptions = {}) {
        const operations = [];

        for (const file of files) {
            // Step 1: Extract content
            operations.push({
                type: 'extract_content',
                target: file,
                options: { fileId: file.id, step: 1 }
            });

            // Step 2: Generate preview
            if (pipelineOptions.includePreview !== false) {
                operations.push({
                    type: 'generate_preview',
                    target: file,
                    options: { fileId: file.id, step: 2, dependsOn: `extract_content_${file.id}` }
                });
            }

            // Step 3: Analyze content
            if (pipelineOptions.includeAnalysis !== false) {
                operations.push({
                    type: 'analyze_content',
                    target: file,
                    options: { 
                        fileId: file.id, 
                        step: 3, 
                        dependsOn: `extract_content_${file.id}`,
                        ...pipelineOptions.analysisOptions
                    }
                });
            }

            // Step 4: Generate embeddings
            if (pipelineOptions.includeEmbeddings !== false) {
                operations.push({
                    type: 'generate_file_embedding',
                    target: file,
                    options: { 
                        fileId: file.id, 
                        step: 4, 
                        dependsOn: `extract_content_${file.id}`,
                        ...pipelineOptions.embeddingOptions
                    }
                });
            }
        }

        return this.createBatch(operations, {
            batchSize: pipelineOptions.batchSize || 10,
            concurrency: pipelineOptions.concurrency || 2,
            metadata: {
                type: 'processing_pipeline',
                fileCount: files.length,
                stepsPerFile: operations.length / files.length,
                totalSteps: operations.length
            }
        });
    }

    /**
     * Execute single operation with retry logic
     */
    async executeOperation(operation, options = {}) {
        const startTime = Date.now();
        let lastError = null;
        
        for (let attempt = 1; attempt <= (options.retryAttempts || this.options.retryAttempts); attempt++) {
            try {
                this._emit('operation:attempt', {
                    operation: operation.type,
                    attempt,
                    target: operation.target?.id || 'unknown'
                });

                const result = await this._performOperation(operation, options);
                
                const duration = Date.now() - startTime;
                this.stats.successfulOperations++;
                this.stats.totalProcessingTime += duration;

                this._emit('operation:success', {
                    operation: operation.type,
                    attempt,
                    duration,
                    result
                });

                return { success: true, result, duration, attempts: attempt };

            } catch (error) {
                lastError = error;
                
                this._emit('operation:failed', {
                    operation: operation.type,
                    attempt,
                    error: error.message,
                    target: operation.target?.id || 'unknown'
                });

                if (attempt < (options.retryAttempts || this.options.retryAttempts)) {
                    const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
                    await this._sleep(delay);
                }
            }
        }

        this.stats.failedOperations++;
        
        return {
            success: false,
            error: lastError.message,
            duration: Date.now() - startTime,
            attempts: options.retryAttempts || this.options.retryAttempts
        };
    }

    /**
     * Get service statistics
     */
    getStats() {
        const activeCount = this.activeBatches.size;
        const totalOps = this.stats.totalOperations;
        
        return {
            ...this.stats,
            activeBatches: activeCount,
            queuedOperations: this.operationQueue.length,
            avgBatchSize: totalOps > 0 ? totalOps / this.stats.totalBatches : 0,
            avgOperationTime: this.stats.successfulOperations > 0 ? 
                this.stats.totalProcessingTime / this.stats.successfulOperations : 0,
            successRate: totalOps > 0 ? 
                (this.stats.successfulOperations / totalOps) * 100 : 0,
            currentRateLimit: {
                minuteRequests: this.rateLimiter.minuteWindow.length,
                hourRequests: this.rateLimiter.hourWindow.length,
                maxMinute: this.options.rateLimit.requestsPerMinute,
                maxHour: this.options.rateLimit.requestsPerHour
            }
        };
    }

    /**
     * Perform individual operation based on type
     */
    async _performOperation(operation, options = {}) {
        // Update rate limiting
        this._recordRequest();

        switch (operation.type) {
            case 'analyze_file':
                return await this._analyzeFile(operation.target, operation.options);
            
            case 'generate_embedding':
                return await this._generateEmbedding(operation.target, operation.options);
            
            case 'upload_to_qdrant':
                return await this._uploadToQdrant(operation.target, operation.options);
            
            case 'extract_content':
                return await this._extractContent(operation.target, operation.options);
            
            case 'generate_preview':
                return await this._generatePreview(operation.target, operation.options);
            
            case 'analyze_content':
                return await this._analyzeContent(operation.target, operation.options);
            
            case 'generate_file_embedding':
                return await this._generateFileEmbedding(operation.target, operation.options);
            
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }

    /**
     * Rate limiting implementation
     */
    _initializeRateLimit() {
        setInterval(() => {
            this._cleanupRateLimit();
        }, 60000); // Cleanup every minute
    }

    _checkRateLimit(operationCount) {
        this._cleanupRateLimit();
        
        const minuteCount = this.rateLimiter.minuteWindow.length;
        const hourCount = this.rateLimiter.hourWindow.length;
        
        return (minuteCount + operationCount <= this.options.rateLimit.requestsPerMinute) &&
               (hourCount + operationCount <= this.options.rateLimit.requestsPerHour);
    }

    _recordRequest() {
        const now = Date.now();
        this.rateLimiter.minuteWindow.push(now);
        this.rateLimiter.hourWindow.push(now);
    }

    _cleanupRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const oneHourAgo = now - 3600000;

        this.rateLimiter.minuteWindow = this.rateLimiter.minuteWindow.filter(time => time > oneMinuteAgo);
        this.rateLimiter.hourWindow = this.rateLimiter.hourWindow.filter(time => time > oneHourAgo);
    }

    _startRateLimitCleanup() {
        setInterval(() => {
            this._cleanupRateLimit();
        }, 60000);
    }

    /**
     * Utility methods
     */
    _generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Event handling
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    _emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`BatchOperations event handler error:`, error);
            }
        });

        // Emit to global event bus if available
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.emit(event, data);
        }
    }

    /**
     * Placeholder operation methods - to be integrated with existing services
     */
    async _analyzeFile(file, options) {
        // TODO: Integrate with AIAPIManager
        throw new Error('File analysis integration not implemented');
    }

    async _generateEmbedding(text, options) {
        // TODO: Integrate with EmbeddingService
        throw new Error('Embedding generation integration not implemented');
    }

    async _uploadToQdrant(points, options) {
        // TODO: Integrate with QdrantService
        throw new Error('Qdrant upload integration not implemented');
    }

    async _extractContent(file, options) {
        // TODO: Integrate with FileUtils
        throw new Error('Content extraction integration not implemented');
    }

    async _generatePreview(file, options) {
        // TODO: Integrate with PreviewUtils
        throw new Error('Preview generation integration not implemented');
    }

    async _analyzeContent(file, options) {
        // TODO: Integrate with AnalysisManager
        throw new Error('Content analysis integration not implemented');
    }

    async _generateFileEmbedding(file, options) {
        // TODO: Integrate with EmbeddingService
        throw new Error('File embedding generation integration not implemented');
    }

    async _loadPersistedBatches() {
        // TODO: Load persisted batch state
        return [];
    }
}

/**
 * Individual Batch Operation Class
 */
class BatchOperation {
    constructor(config, batchService) {
        this.config = config;
        this.batchService = batchService;
        this.status = config.status;
        this.progress = {
            total: config.operations.length,
            completed: 0,
            failed: 0,
            skipped: 0,
            inProgress: 0,
            percentage: 0
        };
        this.results = [];
        this.errors = [];
        this.startedAt = null;
        this.completedAt = null;
        this.pausedAt = null;
        this.cancelledAt = null;
        this.activeOperations = new Map();
    }

    async start() {
        if (this.status !== 'created' && this.status !== 'paused') {
            throw new Error(`Cannot start batch in status: ${this.status}`);
        }

        this.status = 'running';
        this.startedAt = Date.now();
        
        this.batchService._emit('batch:started', {
            batchId: this.config.id,
            operationCount: this.config.operations.length
        });

        try {
            await this._processOperations();
            
            if (this.status !== 'cancelled') {
                this.status = 'completed';
                this.completedAt = Date.now();
                this.batchService.stats.successfulBatches++;
            }
            
        } catch (error) {
            this.status = 'failed';
            this.completedAt = Date.now();
            this.errors.push({
                message: error.message,
                timestamp: Date.now(),
                context: 'batch_execution'
            });
            this.batchService.stats.failedBatches++;
        }

        // Move to history
        this.batchService.batchHistory.push(this.getStatus());
        this.batchService.activeBatches.delete(this.config.id);

        this.batchService._emit('batch:completed', {
            batchId: this.config.id,
            status: this.status,
            duration: this.completedAt - this.startedAt,
            results: this.progress
        });
    }

    async pause() {
        if (this.status !== 'running') {
            throw new Error(`Cannot pause batch in status: ${this.status}`);
        }

        this.status = 'paused';
        this.pausedAt = Date.now();
        
        // Cancel active operations
        for (const [opId, operation] of this.activeOperations) {
            if (operation.cancel) {
                await operation.cancel();
            }
        }
        this.activeOperations.clear();
    }

    async cancel(reason = 'User requested') {
        this.status = 'cancelled';
        this.cancelledAt = Date.now();
        
        // Cancel active operations
        for (const [opId, operation] of this.activeOperations) {
            if (operation.cancel) {
                await operation.cancel();
            }
        }
        this.activeOperations.clear();
    }

    async _processOperations() {
        const operations = [...this.config.operations];
        const batches = this._createBatches(operations, this.config.batchSize);

        for (const batch of batches) {
            if (this.status === 'cancelled' || this.status === 'paused') {
                break;
            }

            await this._processBatch(batch);
        }
    }

    async _processBatch(batch) {
        const promises = batch.map(operation => this._processOperation(operation));
        await Promise.allSettled(promises);
    }

    async _processOperation(operation) {
        if (this.status === 'cancelled' || this.status === 'paused') {
            return;
        }

        const operationId = `${operation.type}_${Date.now()}_${Math.random()}`;
        this.progress.inProgress++;
        
        try {
            const result = await this.batchService.executeOperation(operation, {
                timeout: this.config.timeout,
                retryAttempts: this.config.retryAttempts
            });

            if (result.success) {
                this.progress.completed++;
                this.results.push({
                    operation,
                    result: result.result,
                    duration: result.duration
                });
            } else {
                this.progress.failed++;
                this.errors.push({
                    operation,
                    error: result.error,
                    duration: result.duration
                });
            }

        } catch (error) {
            this.progress.failed++;
            this.errors.push({
                operation,
                error: error.message,
                timestamp: Date.now()
            });
        } finally {
            this.progress.inProgress--;
            this.progress.percentage = Math.round(
                ((this.progress.completed + this.progress.failed + this.progress.skipped) / this.progress.total) * 100
            );
            
            this.batchService._emit('batch:progress', {
                batchId: this.config.id,
                progress: this.progress
            });
        }
    }

    _createBatches(operations, batchSize) {
        const batches = [];
        for (let i = 0; i < operations.length; i += batchSize) {
            batches.push(operations.slice(i, i + batchSize));
        }
        return batches;
    }

    getStatus() {
        return {
            id: this.config.id,
            status: this.status,
            progress: this.progress,
            metadata: this.config.metadata,
            createdAt: this.config.createdAt,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            pausedAt: this.pausedAt,
            cancelledAt: this.cancelledAt,
            duration: this.completedAt ? 
                (this.completedAt - this.startedAt) : 
                (this.startedAt ? (Date.now() - this.startedAt) : 0),
            errorCount: this.errors.length,
            resultCount: this.results.length
        };
    }
}

// Export for V2 integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BatchOperations, BatchOperation };
} else if (typeof window !== 'undefined') {
    window.BatchOperations = BatchOperations;
    window.BatchOperation = BatchOperation;
}
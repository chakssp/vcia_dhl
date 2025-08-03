/**
 * Batch Operations Manager for KC V2
 * Handles efficient batch processing of multiple operations
 */

export class BatchOperations {
  constructor(api) {
    this.api = api;
    this.batchSize = 100;
    this.concurrency = 5;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.operations = new Map();
    this.results = new Map();
    this.progress = new Map();
    this.abortControllers = new Map();
  }

  /**
   * Create a new batch operation
   */
  createBatch(id = null) {
    const batchId = id || this.generateBatchId();
    
    this.operations.set(batchId, {
      id: batchId,
      operations: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      totalOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      results: []
    });
    
    return batchId;
  }

  /**
   * Add operation to batch
   */
  addOperation(batchId, operation) {
    const batch = this.operations.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    if (batch.status !== 'pending') {
      throw new Error(`Cannot add operations to ${batch.status} batch`);
    }
    
    const op = {
      id: this.generateOperationId(),
      type: operation.type,
      method: operation.method,
      endpoint: operation.endpoint,
      data: operation.data,
      options: operation.options || {},
      status: 'pending',
      attempts: 0,
      result: null,
      error: null
    };
    
    batch.operations.push(op);
    batch.totalOperations++;
    
    return op.id;
  }

  /**
   * Add multiple operations
   */
  addOperations(batchId, operations) {
    return operations.map(op => this.addOperation(batchId, op));
  }

  /**
   * Execute batch operations
   */
  async executeBatch(batchId, options = {}) {
    const batch = this.operations.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    if (batch.status !== 'pending') {
      throw new Error(`Batch ${batchId} is already ${batch.status}`);
    }
    
    // Create abort controller
    const abortController = new AbortController();
    this.abortControllers.set(batchId, abortController);
    
    // Update batch status
    batch.status = 'running';
    batch.startedAt = new Date().toISOString();
    
    // Initialize progress
    this.progress.set(batchId, {
      total: batch.totalOperations,
      completed: 0,
      failed: 0,
      percentage: 0
    });
    
    try {
      // Process operations
      const results = await this.processOperations(
        batch.operations,
        {
          ...options,
          batchId,
          signal: abortController.signal
        }
      );
      
      // Update batch with results
      batch.results = results;
      batch.completedOperations = results.filter(r => r.status === 'success').length;
      batch.failedOperations = results.filter(r => r.status === 'failed').length;
      batch.status = batch.failedOperations === 0 ? 'completed' : 'completed_with_errors';
      
    } catch (error) {
      batch.status = 'failed';
      batch.error = error.message;
      throw error;
      
    } finally {
      batch.completedAt = new Date().toISOString();
      this.abortControllers.delete(batchId);
    }
    
    return this.getBatchResult(batchId);
  }

  /**
   * Process operations with concurrency control
   */
  async processOperations(operations, options) {
    const { batchId, signal } = options;
    const results = [];
    const queue = [...operations];
    const inProgress = new Map();
    
    const processNext = async () => {
      if (queue.length === 0 || signal?.aborted) return;
      
      const operation = queue.shift();
      const promise = this.executeOperation(operation, options);
      
      inProgress.set(operation.id, promise);
      
      try {
        const result = await promise;
        results.push(result);
        
        // Update progress
        this.updateProgress(batchId);
        
      } catch (error) {
        results.push({
          operationId: operation.id,
          status: 'failed',
          error: error.message
        });
      } finally {
        inProgress.delete(operation.id);
        await processNext();
      }
    };
    
    // Start concurrent processing
    const workers = Array(Math.min(this.concurrency, operations.length))
      .fill()
      .map(() => processNext());
    
    await Promise.all(workers);
    
    return results;
  }

  /**
   * Execute single operation with retry
   */
  async executeOperation(operation, options) {
    const { signal } = options;
    let lastError;
    
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      if (signal?.aborted) {
        throw new Error('Operation aborted');
      }
      
      try {
        operation.attempts = attempt + 1;
        operation.status = 'running';
        
        // Execute based on type
        let result;
        switch (operation.type) {
          case 'api':
            result = await this.executeAPIOperation(operation);
            break;
          case 'file':
            result = await this.executeFileOperation(operation);
            break;
          case 'analysis':
            result = await this.executeAnalysisOperation(operation);
            break;
          case 'export':
            result = await this.executeExportOperation(operation);
            break;
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }
        
        operation.status = 'success';
        operation.result = result;
        
        return {
          operationId: operation.id,
          status: 'success',
          result
        };
        
      } catch (error) {
        lastError = error;
        operation.error = error.message;
        
        // Check if retryable
        if (!this.isRetryableError(error) || attempt === this.retryAttempts - 1) {
          operation.status = 'failed';
          throw error;
        }
        
        // Wait before retry
        await this.delay(this.retryDelay * Math.pow(2, attempt));
      }
    }
    
    throw lastError;
  }

  /**
   * Execute API operation
   */
  async executeAPIOperation(operation) {
    const { method, endpoint, data, options } = operation;
    
    switch (method.toUpperCase()) {
      case 'GET':
        return await this.api.get(endpoint, data);
      case 'POST':
        return await this.api.post(endpoint, data);
      case 'PUT':
        return await this.api.put(endpoint, data);
      case 'PATCH':
        return await this.api.patch(endpoint, data);
      case 'DELETE':
        return await this.api.delete(endpoint);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  /**
   * Execute file operation
   */
  async executeFileOperation(operation) {
    const { data } = operation;
    
    switch (data.action) {
      case 'create':
        return await this.api.createFile(data.file);
      case 'update':
        return await this.api.updateFile(data.fileId, data.updates);
      case 'delete':
        return await this.api.deleteFile(data.fileId);
      case 'analyze':
        return await this.api.analyzeFile(data.file, data.options);
      default:
        throw new Error(`Unknown file action: ${data.action}`);
    }
  }

  /**
   * Execute analysis operation
   */
  async executeAnalysisOperation(operation) {
    const { data } = operation;
    
    // Analyze multiple files
    if (data.files) {
      const results = [];
      for (const file of data.files) {
        const result = await this.api.analyzeFile(file, data.options);
        results.push(result);
      }
      return results;
    }
    
    // Single file analysis
    return await this.api.analyzeFile(data.file, data.options);
  }

  /**
   * Execute export operation
   */
  async executeExportOperation(operation) {
    const { data } = operation;
    return await this.api.exportData(data.format, data.options);
  }

  /**
   * Batch file operations
   */
  async batchCreateFiles(files, options = {}) {
    const batchId = this.createBatch();
    
    files.forEach(file => {
      this.addOperation(batchId, {
        type: 'file',
        method: 'POST',
        endpoint: '/files',
        data: { action: 'create', file }
      });
    });
    
    return await this.executeBatch(batchId, options);
  }

  async batchUpdateFiles(updates, options = {}) {
    const batchId = this.createBatch();
    
    updates.forEach(({ fileId, updates }) => {
      this.addOperation(batchId, {
        type: 'file',
        method: 'PATCH',
        endpoint: `/files/${fileId}`,
        data: { action: 'update', fileId, updates }
      });
    });
    
    return await this.executeBatch(batchId, options);
  }

  async batchDeleteFiles(fileIds, options = {}) {
    const batchId = this.createBatch();
    
    fileIds.forEach(fileId => {
      this.addOperation(batchId, {
        type: 'file',
        method: 'DELETE',
        endpoint: `/files/${fileId}`,
        data: { action: 'delete', fileId }
      });
    });
    
    return await this.executeBatch(batchId, options);
  }

  async batchAnalyzeFiles(files, analysisOptions = {}, batchOptions = {}) {
    const batchId = this.createBatch();
    
    files.forEach(file => {
      this.addOperation(batchId, {
        type: 'analysis',
        method: 'POST',
        endpoint: '/analysis/analyze',
        data: { file, options: analysisOptions }
      });
    });
    
    return await this.executeBatch(batchId, batchOptions);
  }

  /**
   * Batch category operations
   */
  async batchAssignCategories(assignments, options = {}) {
    const batchId = this.createBatch();
    
    assignments.forEach(({ fileId, categories }) => {
      this.addOperation(batchId, {
        type: 'file',
        method: 'PATCH',
        endpoint: `/files/${fileId}`,
        data: {
          action: 'update',
          fileId,
          updates: { categories }
        }
      });
    });
    
    return await this.executeBatch(batchId, options);
  }

  /**
   * Batch export operations
   */
  async batchExport(exports, options = {}) {
    const batchId = this.createBatch();
    
    exports.forEach(exportConfig => {
      this.addOperation(batchId, {
        type: 'export',
        method: 'POST',
        endpoint: '/export',
        data: exportConfig
      });
    });
    
    return await this.executeBatch(batchId, options);
  }

  /**
   * Progress tracking
   */
  updateProgress(batchId) {
    const batch = this.operations.get(batchId);
    if (!batch) return;
    
    const progress = {
      total: batch.totalOperations,
      completed: batch.operations.filter(op => op.status === 'success').length,
      failed: batch.operations.filter(op => op.status === 'failed').length,
      percentage: 0
    };
    
    progress.percentage = progress.total > 0 
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;
    
    this.progress.set(batchId, progress);
    
    // Emit progress event
    window.dispatchEvent(new CustomEvent('batch:progress', {
      detail: { batchId, progress }
    }));
  }

  getProgress(batchId) {
    return this.progress.get(batchId) || null;
  }

  /**
   * Abort batch operation
   */
  abortBatch(batchId) {
    const controller = this.abortControllers.get(batchId);
    if (controller) {
      controller.abort();
      
      const batch = this.operations.get(batchId);
      if (batch) {
        batch.status = 'aborted';
        batch.completedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Get batch results
   */
  getBatchResult(batchId) {
    const batch = this.operations.get(batchId);
    if (!batch) return null;
    
    return {
      id: batch.id,
      status: batch.status,
      totalOperations: batch.totalOperations,
      completedOperations: batch.completedOperations,
      failedOperations: batch.failedOperations,
      createdAt: batch.createdAt,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      duration: batch.completedAt && batch.startedAt
        ? new Date(batch.completedAt) - new Date(batch.startedAt)
        : null,
      results: batch.results,
      error: batch.error
    };
  }

  getAllBatches() {
    return Array.from(this.operations.values()).map(batch => ({
      id: batch.id,
      status: batch.status,
      totalOperations: batch.totalOperations,
      completedOperations: batch.completedOperations,
      failedOperations: batch.failedOperations,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt
    }));
  }

  /**
   * Clean up completed batches
   */
  cleanup(olderThan = 3600000) { // 1 hour default
    const now = Date.now();
    const toDelete = [];
    
    this.operations.forEach((batch, id) => {
      if (batch.completedAt) {
        const age = now - new Date(batch.completedAt).getTime();
        if (age > olderThan) {
          toDelete.push(id);
        }
      }
    });
    
    toDelete.forEach(id => {
      this.operations.delete(id);
      this.progress.delete(id);
      this.results.delete(id);
    });
    
    return toDelete.length;
  }

  /**
   * Utility methods
   */
  generateBatchId() {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateOperationId() {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  isRetryableError(error) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status) || 
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export batch results
   */
  exportBatchResults(batchId, format = 'json') {
    const result = this.getBatchResult(batchId);
    if (!result) return null;
    
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      
      case 'csv':
        const headers = ['Operation ID', 'Status', 'Error'];
        const rows = result.results.map(r => [
          r.operationId,
          r.status,
          r.error || ''
        ]);
        
        return [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}
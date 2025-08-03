/**
 * DataSyncService - V1-V2 Bidirectional Data Synchronization
 * 
 * Manages synchronization between V1 legacy system and V2 architecture
 * Handles conflict resolution, delta updates, and error recovery
 * 
 * @version 2.0.0
 * @author Knowledge Consolidator Team
 */

class DataSyncService {
    constructor(options = {}) {
        this.options = {
            syncInterval: options.syncInterval || 30000, // 30 seconds
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
            conflictResolution: options.conflictResolution || 'v2_wins',
            batchSize: options.batchSize || 50,
            enableDeltaSync: options.enableDeltaSync !== false,
            ...options
        };

        this.syncState = {
            lastV1Sync: null,
            lastV2Sync: null,
            syncInProgress: false,
            conflicts: [],
            errors: [],
            stats: {
                syncsCompleted: 0,
                conflictsResolved: 0,
                errorsRecovered: 0,
                lastSyncDuration: 0
            }
        };

        this.syncQueue = [];
        this.conflictHandlers = new Map();
        this.deltaTrackers = new Map();
        this.syncTimer = null;

        this.eventHandlers = new Map();
        this._setupDefaultConflictHandlers();
    }

    /**
     * Initialize the sync service
     */
    async initialize() {
        try {
            await this._loadSyncState();
            await this._initializeDeltaTracking();
            this._startPeriodicSync();
            
            this._emit('sync:initialized', { service: 'DataSyncService' });
            return { success: true, message: 'DataSyncService initialized' };
        } catch (error) {
            this._emit('sync:error', { error: error.message, context: 'initialization' });
            throw error;
        }
    }

    /**
     * Perform bidirectional synchronization
     */
    async performSync(options = {}) {
        if (this.syncState.syncInProgress) {
            return { success: false, message: 'Sync already in progress' };
        }

        const syncId = this._generateSyncId();
        const startTime = Date.now();

        try {
            this.syncState.syncInProgress = true;
            this._emit('sync:started', { syncId, timestamp: startTime });

            // Phase 1: Collect changes from both systems
            const v1Changes = await this._collectV1Changes();
            const v2Changes = await this._collectV2Changes();

            // Phase 2: Detect conflicts
            const conflicts = await this._detectConflicts(v1Changes, v2Changes);

            // Phase 3: Resolve conflicts
            const resolvedChanges = await this._resolveConflicts(conflicts);

            // Phase 4: Apply changes
            const syncResults = await this._applyChanges(resolvedChanges);

            // Phase 5: Update sync state
            await this._updateSyncState(syncResults);

            const duration = Date.now() - startTime;
            this.syncState.stats.lastSyncDuration = duration;
            this.syncState.stats.syncsCompleted++;

            this._emit('sync:completed', {
                syncId,
                duration,
                changes: syncResults.totalChanges,
                conflicts: conflicts.length
            });

            return {
                success: true,
                syncId,
                duration,
                results: syncResults
            };

        } catch (error) {
            this._emit('sync:error', {
                syncId,
                error: error.message,
                duration: Date.now() - startTime
            });
            throw error;
        } finally {
            this.syncState.syncInProgress = false;
        }
    }

    /**
     * Collect changes from V1 system
     */
    async _collectV1Changes() {
        const lastSync = this.syncState.lastV1Sync;
        const changes = {
            files: [],
            categories: [],
            analyses: [],
            configurations: []
        };

        try {
            // Get V1 data through LegacyBridge
            const v1Data = await this._getV1Data(lastSync);
            
            if (this.options.enableDeltaSync && lastSync) {
                // Delta sync - only changes since last sync
                changes.files = v1Data.files.filter(f => f.modifiedAt > lastSync);
                changes.categories = v1Data.categories.filter(c => c.modifiedAt > lastSync);
                changes.analyses = v1Data.analyses.filter(a => a.modifiedAt > lastSync);
            } else {
                // Full sync
                changes.files = v1Data.files || [];
                changes.categories = v1Data.categories || [];
                changes.analyses = v1Data.analyses || [];
            }

            this._emit('sync:v1_changes_collected', {
                count: this._countChanges(changes)
            });

            return changes;

        } catch (error) {
            this._emit('sync:error', {
                phase: 'v1_collection',
                error: error.message
            });
            throw new Error(`Failed to collect V1 changes: ${error.message}`);
        }
    }

    /**
     * Collect changes from V2 system
     */
    async _collectV2Changes() {
        const lastSync = this.syncState.lastV2Sync;
        const changes = {
            files: [],
            categories: [],
            analyses: [],
            configurations: []
        };

        try {
            // Get V2 data from current system
            const v2Data = await this._getV2Data(lastSync);
            
            if (this.options.enableDeltaSync && lastSync) {
                // Delta sync - only changes since last sync
                changes.files = v2Data.files.filter(f => f.updatedAt > lastSync);
                changes.categories = v2Data.categories.filter(c => c.updatedAt > lastSync);
                changes.analyses = v2Data.analyses.filter(a => a.updatedAt > lastSync);
            } else {
                // Full sync
                changes.files = v2Data.files || [];
                changes.categories = v2Data.categories || [];
                changes.analyses = v2Data.analyses || [];
            }

            this._emit('sync:v2_changes_collected', {
                count: this._countChanges(changes)
            });

            return changes;

        } catch (error) {
            this._emit('sync:error', {
                phase: 'v2_collection',
                error: error.message
            });
            throw new Error(`Failed to collect V2 changes: ${error.message}`);
        }
    }

    /**
     * Detect conflicts between V1 and V2 changes
     */
    async _detectConflicts(v1Changes, v2Changes) {
        const conflicts = [];

        // Check for file conflicts
        for (const v1File of v1Changes.files) {
            const v2File = v2Changes.files.find(f => f.id === v1File.id);
            if (v2File && this._hasConflict(v1File, v2File)) {
                conflicts.push({
                    type: 'file',
                    id: v1File.id,
                    v1Data: v1File,
                    v2Data: v2File,
                    conflictFields: this._getConflictFields(v1File, v2File)
                });
            }
        }

        // Check for category conflicts
        for (const v1Category of v1Changes.categories) {
            const v2Category = v2Changes.categories.find(c => c.id === v1Category.id);
            if (v2Category && this._hasConflict(v1Category, v2Category)) {
                conflicts.push({
                    type: 'category',
                    id: v1Category.id,
                    v1Data: v1Category,
                    v2Data: v2Category,
                    conflictFields: this._getConflictFields(v1Category, v2Category)
                });
            }
        }

        this._emit('sync:conflicts_detected', {
            count: conflicts.length,
            types: [...new Set(conflicts.map(c => c.type))]
        });

        return conflicts;
    }

    /**
     * Resolve conflicts using configured strategy
     */
    async _resolveConflicts(conflicts) {
        const resolved = {
            v1Changes: { files: [], categories: [], analyses: [] },
            v2Changes: { files: [], categories: [], analyses: [] },
            merged: { files: [], categories: [], analyses: [] }
        };

        for (const conflict of conflicts) {
            try {
                const resolution = await this._resolveConflict(conflict);
                
                if (resolution.strategy === 'v1_wins') {
                    resolved.v2Changes[conflict.type].push(resolution.data);
                } else if (resolution.strategy === 'v2_wins') {
                    resolved.v1Changes[conflict.type].push(resolution.data);
                } else if (resolution.strategy === 'merge') {
                    resolved.merged[conflict.type].push(resolution.data);
                }

                this.syncState.stats.conflictsResolved++;

            } catch (error) {
                this._emit('sync:conflict_resolution_failed', {
                    conflict: conflict.id,
                    error: error.message
                });
                
                // Apply default resolution
                if (this.options.conflictResolution === 'v2_wins') {
                    resolved.v1Changes[conflict.type].push(conflict.v2Data);
                } else {
                    resolved.v2Changes[conflict.type].push(conflict.v1Data);
                }
            }
        }

        return resolved;
    }

    /**
     * Apply resolved changes to both systems
     */
    async _applyChanges(resolvedChanges) {
        const results = {
            v1Applied: 0,
            v2Applied: 0,
            mergedApplied: 0,
            errors: [],
            totalChanges: 0
        };

        try {
            // Apply changes to V1 system
            if (this._hasChanges(resolvedChanges.v1Changes)) {
                const v1Results = await this._applyV1Changes(resolvedChanges.v1Changes);
                results.v1Applied = v1Results.applied;
                results.errors.push(...v1Results.errors);
            }

            // Apply changes to V2 system
            if (this._hasChanges(resolvedChanges.v2Changes)) {
                const v2Results = await this._applyV2Changes(resolvedChanges.v2Changes);
                results.v2Applied = v2Results.applied;
                results.errors.push(...v2Results.errors);
            }

            // Apply merged changes to both systems
            if (this._hasChanges(resolvedChanges.merged)) {
                const mergedResults = await this._applyMergedChanges(resolvedChanges.merged);
                results.mergedApplied = mergedResults.applied;
                results.errors.push(...mergedResults.errors);
            }

            results.totalChanges = results.v1Applied + results.v2Applied + results.mergedApplied;

            return results;

        } catch (error) {
            this._emit('sync:apply_changes_failed', {
                error: error.message,
                results
            });
            throw error;
        }
    }

    /**
     * Queue manual sync operation
     */
    queueSync(data, priority = 'normal') {
        const syncOperation = {
            id: this._generateSyncId(),
            data,
            priority,
            timestamp: Date.now(),
            retries: 0
        };

        if (priority === 'high') {
            this.syncQueue.unshift(syncOperation);
        } else {
            this.syncQueue.push(syncOperation);
        }

        this._emit('sync:queued', { id: syncOperation.id, priority });

        // Process queue if not already processing
        if (!this.syncState.syncInProgress) {
            this._processQueue();
        }

        return syncOperation.id;
    }

    /**
     * Add custom conflict handler
     */
    addConflictHandler(type, handler) {
        this.conflictHandlers.set(type, handler);
    }

    /**
     * Get synchronization statistics
     */
    getStats() {
        return {
            ...this.syncState.stats,
            queueLength: this.syncQueue.length,
            conflictsCount: this.syncState.conflicts.length,
            errorsCount: this.syncState.errors.length,
            lastSync: Math.max(
                this.syncState.lastV1Sync || 0,
                this.syncState.lastV2Sync || 0
            )
        };
    }

    /**
     * Setup default conflict resolution handlers
     */
    _setupDefaultConflictHandlers() {
        // Default file conflict handler
        this.addConflictHandler('file', (conflict) => {
            switch (this.options.conflictResolution) {
                case 'v1_wins':
                    return { strategy: 'v1_wins', data: conflict.v1Data };
                case 'v2_wins':
                    return { strategy: 'v2_wins', data: conflict.v2Data };
                case 'newest_wins':
                    const v1Newer = conflict.v1Data.modifiedAt > conflict.v2Data.updatedAt;
                    return {
                        strategy: v1Newer ? 'v1_wins' : 'v2_wins',
                        data: v1Newer ? conflict.v1Data : conflict.v2Data
                    };
                case 'merge':
                    return {
                        strategy: 'merge',
                        data: this._mergeFileData(conflict.v1Data, conflict.v2Data)
                    };
                default:
                    return { strategy: 'v2_wins', data: conflict.v2Data };
            }
        });

        // Default category conflict handler
        this.addConflictHandler('category', (conflict) => {
            return {
                strategy: 'merge',
                data: this._mergeCategoryData(conflict.v1Data, conflict.v2Data)
            };
        });
    }

    /**
     * Merge file data intelligently
     */
    _mergeFileData(v1Data, v2Data) {
        return {
            ...v1Data,
            ...v2Data,
            id: v1Data.id,
            // Preserve newer timestamp
            modifiedAt: Math.max(v1Data.modifiedAt, v2Data.updatedAt),
            // Merge categories
            categories: [...new Set([
                ...(v1Data.categories || []),
                ...(v2Data.categories || [])
            ])],
            // Preserve analysis if newer
            analysis: v1Data.analysis && v2Data.analysis ?
                (v1Data.analysis.timestamp > v2Data.analysis.timestamp ? 
                    v1Data.analysis : v2Data.analysis) :
                (v1Data.analysis || v2Data.analysis),
            // Mark as merged
            _merged: true,
            _mergedAt: Date.now()
        };
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
                console.error(`DataSyncService event handler error:`, error);
            }
        });
    }

    /**
     * Utility methods
     */
    _generateSyncId() {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _countChanges(changes) {
        return Object.values(changes).reduce((total, items) => total + items.length, 0);
    }

    _hasChanges(changes) {
        return this._countChanges(changes) > 0;
    }

    _hasConflict(v1Item, v2Item) {
        // Simple conflict detection based on modification times
        return v1Item.modifiedAt !== v2Item.updatedAt ||
               v1Item.version !== v2Item.version;
    }

    _getConflictFields(v1Item, v2Item) {
        const fields = [];
        const compareFields = ['name', 'content', 'categories', 'analysis'];
        
        for (const field of compareFields) {
            if (JSON.stringify(v1Item[field]) !== JSON.stringify(v2Item[field])) {
                fields.push(field);
            }
        }
        
        return fields;
    }

    /**
     * Start periodic synchronization
     */
    _startPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(async () => {
            try {
                await this.performSync({ automatic: true });
            } catch (error) {
                this._emit('sync:periodic_error', { error: error.message });
            }
        }, this.options.syncInterval);
    }

    /**
     * Stop synchronization service
     */
    stop() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
        
        this._emit('sync:stopped', { timestamp: Date.now() });
    }

    /**
     * Placeholder methods for integration with existing services
     */
    async _getV1Data(lastSync) {
        // TODO: Integrate with LegacyBridge
        throw new Error('V1 data integration not implemented');
    }

    async _getV2Data(lastSync) {
        // TODO: Integrate with V2 AppState and services
        throw new Error('V2 data integration not implemented');
    }

    async _loadSyncState() {
        // TODO: Load sync state from persistence layer
        return this.syncState;
    }

    async _updateSyncState(results) {
        this.syncState.lastV1Sync = Date.now();
        this.syncState.lastV2Sync = Date.now();
        // TODO: Persist sync state
    }

    async _initializeDeltaTracking() {
        // TODO: Initialize delta tracking mechanisms
    }
}

// Export for V2 integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataSyncService;
} else if (typeof window !== 'undefined') {
    window.DataSyncService = DataSyncService;
}
/**
 * VersionedAppState.js - Core Versioning Engine for AppState
 * 
 * Implements complete version control system for application state
 * with snapshot management, version comparison, and efficient storage
 */

(function(window) {
    'use strict';

    // Import dependencies
    const DeltaCompression = window.DeltaCompression || require('./DeltaCompression.js');

    class VersionedAppState {
        constructor(fileId) {
            this.fileId = fileId;
            this.versions = new Map(); // versionId -> version object
            this.versionOrder = []; // Ordered list of versionIds
            this.currentVersionIndex = -1;
            this.maxVersions = 10;
            this.compression = new DeltaCompression();
            
            // Metadata tracking
            this.metadata = {
                created: Date.now(),
                lastModified: Date.now(),
                totalSnapshots: 0,
                totalRestores: 0,
                averageSnapshotTime: 0,
                storageUsed: 0
            };

            // Performance tracking
            this.performanceMetrics = {
                snapshotTimes: [],
                restoreTimes: [],
                comparisonTimes: []
            };
        }

        /**
         * Creates a snapshot of the current state
         * @param {Object} state - Current application state
         * @param {Object} metadata - Snapshot metadata
         * @returns {string} versionId of created snapshot
         */
        createSnapshot(state, metadata = {}) {
            const startTime = performance.now();

            try {
                // Generate unique version ID
                const versionId = this._generateVersionId();
                const timestamp = Date.now();

                // Get previous version for delta compression
                const previousVersion = this.currentVersionIndex >= 0 
                    ? this.versions.get(this.versionOrder[this.currentVersionIndex])
                    : null;

                // For compression with delta, we need to handle previous version properly
                let compressedVersion;
                if (previousVersion && previousVersion.type === 'delta') {
                    // If previous is delta, we need to decompress it first
                    const previousState = this.compression.decompressVersion(previousVersion, this.versions);
                    const fullPreviousVersion = {
                        ...previousVersion,
                        type: 'full',
                        state: this.compression._compress(previousState)
                    };
                    compressedVersion = this.compression.compressVersion(
                        state,
                        fullPreviousVersion,
                        {
                            ...metadata,
                            versionId,
                            timestamp,
                            index: this.versionOrder.length
                        }
                    );
                } else {
                    // Previous is null or full version
                    compressedVersion = this.compression.compressVersion(
                        state,
                        previousVersion,
                        {
                            ...metadata,
                            versionId,
                            timestamp,
                            index: this.versionOrder.length
                        }
                    );
                }

                // Create version object
                const version = {
                    versionId,
                    timestamp,
                    fileId: this.fileId,
                    ...compressedVersion,
                    metadata: {
                        ...compressedVersion.metadata,
                        ...metadata,
                        snapshotTime: performance.now() - startTime
                    }
                };

                // Store version
                this.versions.set(versionId, version);
                this.versionOrder.push(versionId);
                this.currentVersionIndex = this.versionOrder.length - 1;

                // Cleanup old versions if needed
                this._cleanupOldVersions();

                // Update metadata
                this._updateMetadata('snapshot', version);

                // Track performance
                this._trackPerformance('snapshot', performance.now() - startTime);

                // Emit event if EventBus available
                if (window.KC?.EventBus) {
                    window.KC.EventBus.emit('appstate:snapshot:created', {
                        fileId: this.fileId,
                        versionId,
                        metadata: version.metadata
                    });
                }

                return versionId;

            } catch (error) {
                console.error('Error creating snapshot:', error);
                throw new Error(`Failed to create snapshot: ${error.message}`);
            }
        }

        /**
         * Restores a specific version
         * @param {string} versionId - Version to restore
         * @returns {Object} Restored state
         */
        restoreVersion(versionId) {
            const startTime = performance.now();

            try {
                const version = this.versions.get(versionId);
                if (!version) {
                    throw new Error(`Version ${versionId} not found`);
                }

                // Decompress version to get full state
                const restoredState = this.compression.decompressVersion(
                    version,
                    this.versions
                );

                // Update current version index
                const versionIndex = this.versionOrder.indexOf(versionId);
                if (versionIndex !== -1) {
                    this.currentVersionIndex = versionIndex;
                }

                // Update metadata
                this._updateMetadata('restore', version);

                // Track performance
                this._trackPerformance('restore', performance.now() - startTime);

                // Emit event if EventBus available
                if (window.KC?.EventBus) {
                    window.KC.EventBus.emit('appstate:version:restored', {
                        fileId: this.fileId,
                        versionId,
                        metadata: version.metadata
                    });
                }

                return restoredState;

            } catch (error) {
                console.error('Error restoring version:', error);
                throw new Error(`Failed to restore version: ${error.message}`);
            }
        }

        /**
         * Compares two versions and generates a change set
         * @param {string} versionIdA - First version
         * @param {string} versionIdB - Second version
         * @returns {Object} ChangeSet object
         */
        compareVersions(versionIdA, versionIdB) {
            const startTime = performance.now();

            try {
                const versionA = this.versions.get(versionIdA);
                const versionB = this.versions.get(versionIdB);

                if (!versionA || !versionB) {
                    throw new Error('One or both versions not found');
                }

                // Decompress both versions
                const stateA = this.compression.decompressVersion(versionA, this.versions);
                const stateB = this.compression.decompressVersion(versionB, this.versions);

                // Create delta between versions
                const delta = this.compression.createDelta(stateA, stateB);

                // Format as ChangeSet
                const changeSet = this._formatChangeSet(delta, versionA, versionB);

                // Track performance
                this._trackPerformance('comparison', performance.now() - startTime);

                return changeSet;

            } catch (error) {
                console.error('Error comparing versions:', error);
                throw new Error(`Failed to compare versions: ${error.message}`);
            }
        }

        /**
         * Gets a specific version by ID
         * @param {string} versionId - Version ID
         * @returns {Object} Version object
         */
        getVersion(versionId) {
            const version = this.versions.get(versionId);
            if (!version) {
                return null;
            }

            return {
                ...version,
                state: this.compression.decompressVersion(version, this.versions)
            };
        }

        /**
         * Gets all versions metadata
         * @returns {Array} Array of version metadata
         */
        getAllVersions() {
            return this.versionOrder.map(versionId => {
                const version = this.versions.get(versionId);
                return {
                    versionId: version.versionId,
                    timestamp: version.timestamp,
                    metadata: version.metadata,
                    isCurrent: this.versionOrder[this.currentVersionIndex] === versionId,
                    type: version.type,
                    size: version.type === 'full' 
                        ? version.metadata.size 
                        : version.metadata.deltaSize
                };
            });
        }

        /**
         * Gets the current version
         * @returns {Object} Current version state
         */
        getCurrentVersion() {
            if (this.currentVersionIndex < 0) {
                return null;
            }

            const currentVersionId = this.versionOrder[this.currentVersionIndex];
            return this.getVersion(currentVersionId);
        }

        /**
         * Gets convergence history for the file
         * @returns {Array} Convergence history
         */
        getConvergenceHistory() {
            const history = [];

            for (let i = 1; i < this.versionOrder.length; i++) {
                const prevVersionId = this.versionOrder[i - 1];
                const currVersionId = this.versionOrder[i];
                
                const changeSet = this.compareVersions(prevVersionId, currVersionId);
                const convergenceMetrics = this._calculateConvergenceMetrics(changeSet);

                history.push({
                    fromVersion: prevVersionId,
                    toVersion: currVersionId,
                    timestamp: this.versions.get(currVersionId).timestamp,
                    changeSet,
                    convergenceMetrics
                });
            }

            return history;
        }

        /**
         * Cleans up old versions based on max versions limit
         * @private
         */
        _cleanupOldVersions() {
            if (this.versionOrder.length <= this.maxVersions) {
                return;
            }

            // Keep at least one full snapshot
            let fullSnapshotCount = 0;
            for (const versionId of this.versionOrder) {
                if (this.versions.get(versionId).type === 'full') {
                    fullSnapshotCount++;
                }
            }

            // Remove oldest versions, ensuring we keep at least one full snapshot
            while (this.versionOrder.length > this.maxVersions) {
                const oldestVersionId = this.versionOrder[0];
                const oldestVersion = this.versions.get(oldestVersionId);

                // Don't remove if it's the only full snapshot
                if (oldestVersion.type === 'full' && fullSnapshotCount <= 1) {
                    // Force create a new full snapshot of second oldest
                    if (this.versionOrder.length > 1) {
                        const secondOldestId = this.versionOrder[1];
                        const secondOldest = this.versions.get(secondOldestId);
                        if (secondOldest.type === 'delta') {
                            // Convert to full snapshot
                            const fullState = this.compression.decompressVersion(
                                secondOldest,
                                this.versions
                            );
                            secondOldest.type = 'full';
                            secondOldest.state = this.compression._compress(fullState);
                            delete secondOldest.delta;
                            delete secondOldest.baseVersionId;
                            fullSnapshotCount++;
                        }
                    }
                }

                // Remove the oldest version
                this.versions.delete(oldestVersionId);
                this.versionOrder.shift();
                
                if (oldestVersion.type === 'full') {
                    fullSnapshotCount--;
                }

                // Adjust current version index
                if (this.currentVersionIndex > 0) {
                    this.currentVersionIndex--;
                }
            }

            // Emit cleanup event
            if (window.KC?.EventBus) {
                window.KC.EventBus.emit('appstate:versions:cleaned', {
                    fileId: this.fileId,
                    versionsRemoved: 1,
                    versionsRemaining: this.versionOrder.length
                });
            }
        }

        /**
         * Generates unique version ID
         * @private
         */
        _generateVersionId() {
            return `v_${this.fileId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Formats delta as ChangeSet
         * @private
         */
        _formatChangeSet(delta, versionA, versionB) {
            const changeSet = {
                additions: [],
                modifications: [],
                deletions: [],
                summary: '',
                metadata: {
                    fromVersion: versionA.versionId,
                    toVersion: versionB.versionId,
                    fromTimestamp: versionA.timestamp,
                    toTimestamp: versionB.timestamp,
                    totalChanges: 0
                }
            };

            // Format additions
            for (const [path, value] of Object.entries(delta.additions)) {
                changeSet.additions.push({
                    path,
                    value,
                    reason: 'Property added'
                });
            }

            // Format modifications
            for (const [path, change] of Object.entries(delta.modifications)) {
                changeSet.modifications.push({
                    path,
                    oldValue: change.old,
                    newValue: change.new,
                    reason: 'Property modified'
                });
            }

            // Format deletions
            for (const path of delta.deletions) {
                changeSet.deletions.push({
                    path,
                    oldValue: null, // Would need to look up in versionA
                    reason: 'Property deleted'
                });
            }

            // Calculate total changes
            changeSet.metadata.totalChanges = 
                changeSet.additions.length + 
                changeSet.modifications.length + 
                changeSet.deletions.length;

            // Generate summary
            changeSet.summary = `${changeSet.metadata.totalChanges} changes: ` +
                `${changeSet.additions.length} additions, ` +
                `${changeSet.modifications.length} modifications, ` +
                `${changeSet.deletions.length} deletions`;

            return changeSet;
        }

        /**
         * Calculates convergence metrics from change set
         * @private
         */
        _calculateConvergenceMetrics(changeSet) {
            const totalChanges = changeSet.metadata.totalChanges;
            
            // Simple convergence calculation - fewer changes = more convergence
            const convergenceScore = Math.max(0, 1 - (totalChanges / 100));
            
            return {
                convergenceScore,
                changeVelocity: totalChanges,
                isConverging: totalChanges < 10,
                estimatedIterationsToConverge: Math.ceil(totalChanges / 5)
            };
        }

        /**
         * Updates metadata
         * @private
         */
        _updateMetadata(operation, version) {
            this.metadata.lastModified = Date.now();
            
            if (operation === 'snapshot') {
                this.metadata.totalSnapshots++;
                
                // Update average snapshot time
                const times = this.performanceMetrics.snapshotTimes;
                this.metadata.averageSnapshotTime = 
                    times.reduce((a, b) => a + b, 0) / times.length;
            } else if (operation === 'restore') {
                this.metadata.totalRestores++;
            }

            // Calculate storage used
            this.metadata.storageUsed = this._calculateStorageUsed();
        }

        /**
         * Calculates total storage used
         * @private
         */
        _calculateStorageUsed() {
            let totalSize = 0;
            
            for (const version of this.versions.values()) {
                if (version.type === 'full') {
                    totalSize += version.metadata.size || 0;
                } else {
                    totalSize += version.metadata.deltaSize || 0;
                }
            }

            return totalSize;
        }

        /**
         * Tracks performance metrics
         * @private
         */
        _trackPerformance(operation, time) {
            const metrics = this.performanceMetrics;
            const maxSamples = 100;

            switch (operation) {
                case 'snapshot':
                    metrics.snapshotTimes.push(time);
                    if (metrics.snapshotTimes.length > maxSamples) {
                        metrics.snapshotTimes.shift();
                    }
                    break;
                case 'restore':
                    metrics.restoreTimes.push(time);
                    if (metrics.restoreTimes.length > maxSamples) {
                        metrics.restoreTimes.shift();
                    }
                    break;
                case 'comparison':
                    metrics.comparisonTimes.push(time);
                    if (metrics.comparisonTimes.length > maxSamples) {
                        metrics.comparisonTimes.shift();
                    }
                    break;
            }
        }

        /**
         * Gets performance statistics
         */
        getPerformanceStats() {
            const stats = {};
            
            for (const [operation, times] of Object.entries(this.performanceMetrics)) {
                if (times.length > 0) {
                    stats[operation] = {
                        average: times.reduce((a, b) => a + b, 0) / times.length,
                        min: Math.min(...times),
                        max: Math.max(...times),
                        samples: times.length
                    };
                }
            }

            return stats;
        }

        /**
         * Exports version history
         */
        exportHistory() {
            return {
                fileId: this.fileId,
                metadata: this.metadata,
                versions: this.getAllVersions(),
                convergenceHistory: this.getConvergenceHistory(),
                performanceStats: this.getPerformanceStats(),
                compressionStats: this.compression.getStats()
            };
        }

        /**
         * Clears all versions
         */
        clearHistory() {
            this.versions.clear();
            this.versionOrder = [];
            this.currentVersionIndex = -1;
            this.metadata.totalSnapshots = 0;
            this.metadata.totalRestores = 0;
            this.metadata.storageUsed = 0;
            this.performanceMetrics = {
                snapshotTimes: [],
                restoreTimes: [],
                comparisonTimes: []
            };
            this.compression.resetStats();
        }
    }

    // Export for use in other modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = VersionedAppState;
    } else {
        window.VersionedAppState = VersionedAppState;
    }

})(typeof window !== 'undefined' ? window : this);
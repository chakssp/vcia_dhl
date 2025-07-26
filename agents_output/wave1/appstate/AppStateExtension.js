/**
 * AppStateExtension.js - Integration Layer for Versioned AppState
 * 
 * Seamlessly extends KC.AppState with versioning capabilities
 * without modifying the original implementation
 */

(function(window) {
    'use strict';

    // Import dependencies
    const VersionedAppState = window.VersionedAppState || require('./VersionedAppState.js');

    class AppStateExtension {
        constructor() {
            // Store versioned states for each file
            this.versionedStates = new Map(); // fileId -> VersionedAppState
            
            // Global versioning for entire app state
            this.globalVersioning = new VersionedAppState('global');
            
            // Configuration
            this.config = {
                autoSnapshot: true,
                snapshotInterval: 5, // Number of state changes before auto-snapshot
                enableFileVersioning: true,
                enableGlobalVersioning: true
            };

            // Tracking
            this.changeCounter = 0;
            this.lastSnapshotTime = Date.now();
            
            // Original AppState reference
            this.originalAppState = null;
            
            // Initialize extension
            this._initialize();
        }

        /**
         * Initialize the extension by hooking into KC.AppState
         * @private
         */
        _initialize() {
            // Wait for KC.AppState to be available
            if (!window.KC || !window.KC.AppState) {
                console.warn('AppStateExtension: KC.AppState not available yet, retrying...');
                setTimeout(() => this._initialize(), 100);
                return;
            }

            this.originalAppState = window.KC.AppState;
            
            // Extend AppState with versioning methods
            this._extendAppState();
            
            // Hook into state changes
            this._setupEventListeners();
            
            // Log successful initialization
            if (window.KC.Logger) {
                window.KC.Logger.success('AppStateExtension initialized', {
                    globalVersioning: this.config.enableGlobalVersioning,
                    fileVersioning: this.config.enableFileVersioning
                });
            }
        }

        /**
         * Extends KC.AppState with versioning methods
         * @private
         */
        _extendAppState() {
            const appState = this.originalAppState;
            const extension = this;

            // Add versioning methods to AppState
            
            /**
             * Create a snapshot of current state
             */
            appState.createSnapshot = function(metadata = {}) {
                return extension.createGlobalSnapshot(metadata);
            };

            /**
             * Create a snapshot for specific file
             */
            appState.createFileSnapshot = function(fileId, metadata = {}) {
                return extension.createFileSnapshot(fileId, metadata);
            };

            /**
             * Restore a previous version
             */
            appState.restoreVersion = function(versionId) {
                return extension.restoreGlobalVersion(versionId);
            };

            /**
             * Restore file-specific version
             */
            appState.restoreFileVersion = function(fileId, versionId) {
                return extension.restoreFileVersion(fileId, versionId);
            };

            /**
             * Compare two versions
             */
            appState.compareVersions = function(versionIdA, versionIdB) {
                return extension.compareGlobalVersions(versionIdA, versionIdB);
            };

            /**
             * Get all versions
             */
            appState.getAllVersions = function() {
                return extension.getAllGlobalVersions();
            };

            /**
             * Get file versions
             */
            appState.getFileVersions = function(fileId) {
                return extension.getFileVersions(fileId);
            };

            /**
             * Get versioning statistics
             */
            appState.getVersioningStats = function() {
                return extension.getVersioningStats();
            };

            /**
             * Configure versioning
             */
            appState.configureVersioning = function(config) {
                return extension.configure(config);
            };

            // Override the original set method to track changes
            const originalSet = appState.set.bind(appState);
            appState.set = function(path, value, options = {}) {
                const result = originalSet(path, value, options);
                
                // Track state change for auto-snapshot
                if (!options.skipVersioning) {
                    extension._onStateChange(path, value);
                }
                
                return result;
            };

            // Override the original update method
            const originalUpdate = appState.update.bind(appState);
            appState.update = function(updates, options = {}) {
                const result = originalUpdate(updates, options);
                
                // Track state changes for auto-snapshot
                if (!options.skipVersioning) {
                    extension._onBatchStateChange(updates);
                }
                
                return result;
            };
        }

        /**
         * Setup event listeners for state changes
         * @private
         */
        _setupEventListeners() {
            const EventBus = window.KC.EventBus;
            const Events = window.KC.Events;

            if (!EventBus || !Events) {
                console.warn('AppStateExtension: EventBus not available');
                return;
            }

            // Listen for file analysis completion
            EventBus.on(Events.FILE_ANALYZED, (data) => {
                if (this.config.enableFileVersioning) {
                    this._onFileAnalyzed(data);
                }
            });

            // Listen for file categorization
            EventBus.on(Events.FILE_CATEGORIZED, (data) => {
                if (this.config.enableFileVersioning) {
                    this._onFileCategorized(data);
                }
            });

            // Listen for major state changes
            EventBus.on(Events.STATE_RESTORED, (data) => {
                // Create snapshot after state restore
                if (this.config.enableGlobalVersioning) {
                    this.createGlobalSnapshot({
                        reason: 'state_restored',
                        restoreType: data.type
                    });
                }
            });
        }

        /**
         * Create global state snapshot
         */
        createGlobalSnapshot(metadata = {}) {
            if (!this.config.enableGlobalVersioning) {
                return null;
            }

            try {
                const state = this.originalAppState.export().state;
                const versionId = this.globalVersioning.createSnapshot(state, {
                    ...metadata,
                    timestamp: Date.now(),
                    agent: 'user',
                    automatic: false
                });

                // Reset change counter
                this.changeCounter = 0;
                this.lastSnapshotTime = Date.now();

                if (window.KC.Logger) {
                    window.KC.Logger.success('Global snapshot created', { versionId, metadata });
                }

                return versionId;

            } catch (error) {
                console.error('Error creating global snapshot:', error);
                return null;
            }
        }

        /**
         * Create file-specific snapshot
         */
        createFileSnapshot(fileId, metadata = {}) {
            if (!this.config.enableFileVersioning) {
                return null;
            }

            try {
                // Get or create versioned state for file
                if (!this.versionedStates.has(fileId)) {
                    this.versionedStates.set(fileId, new VersionedAppState(fileId));
                }

                const versionedState = this.versionedStates.get(fileId);
                
                // Get file data from state
                const files = this.originalAppState.get('files') || [];
                const fileData = files.find(f => f.id === fileId);
                
                if (!fileData) {
                    throw new Error(`File ${fileId} not found in state`);
                }

                const versionId = versionedState.createSnapshot(fileData, {
                    ...metadata,
                    timestamp: Date.now(),
                    agent: 'user',
                    automatic: false
                });

                if (window.KC.Logger) {
                    window.KC.Logger.success('File snapshot created', { fileId, versionId, metadata });
                }

                return versionId;

            } catch (error) {
                console.error('Error creating file snapshot:', error);
                return null;
            }
        }

        /**
         * Restore global version
         */
        restoreGlobalVersion(versionId) {
            if (!this.config.enableGlobalVersioning) {
                return false;
            }

            try {
                const restoredState = this.globalVersioning.restoreVersion(versionId);
                
                // Import the restored state
                this.originalAppState.import({ state: restoredState, version: '1.0.0' }, {
                    skipVersioning: true // Avoid creating snapshot during restore
                });

                if (window.KC.Logger) {
                    window.KC.Logger.success('Global version restored', { versionId });
                }

                return true;

            } catch (error) {
                console.error('Error restoring global version:', error);
                return false;
            }
        }

        /**
         * Restore file version
         */
        restoreFileVersion(fileId, versionId) {
            if (!this.config.enableFileVersioning || !this.versionedStates.has(fileId)) {
                return false;
            }

            try {
                const versionedState = this.versionedStates.get(fileId);
                const restoredFileData = versionedState.restoreVersion(versionId);
                
                // Update file in app state
                this.originalAppState.updateItem('files', 
                    f => f.id === fileId,
                    restoredFileData,
                    { skipVersioning: true }
                );

                // Emit file updated event
                if (window.KC.EventBus) {
                    window.KC.EventBus.emit(window.KC.Events.FILES_UPDATED, {
                        files: [restoredFileData],
                        source: 'version_restore'
                    });
                }

                if (window.KC.Logger) {
                    window.KC.Logger.success('File version restored', { fileId, versionId });
                }

                return true;

            } catch (error) {
                console.error('Error restoring file version:', error);
                return false;
            }
        }

        /**
         * Compare global versions
         */
        compareGlobalVersions(versionIdA, versionIdB) {
            if (!this.config.enableGlobalVersioning) {
                return null;
            }

            try {
                return this.globalVersioning.compareVersions(versionIdA, versionIdB);
            } catch (error) {
                console.error('Error comparing versions:', error);
                return null;
            }
        }

        /**
         * Get all global versions
         */
        getAllGlobalVersions() {
            if (!this.config.enableGlobalVersioning) {
                return [];
            }

            return this.globalVersioning.getAllVersions();
        }

        /**
         * Get file versions
         */
        getFileVersions(fileId) {
            if (!this.config.enableFileVersioning || !this.versionedStates.has(fileId)) {
                return [];
            }

            return this.versionedStates.get(fileId).getAllVersions();
        }

        /**
         * Get versioning statistics
         */
        getVersioningStats() {
            const stats = {
                global: {
                    enabled: this.config.enableGlobalVersioning,
                    versions: this.globalVersioning.getAllVersions().length,
                    metadata: this.globalVersioning.metadata,
                    performance: this.globalVersioning.getPerformanceStats(),
                    compression: this.globalVersioning.compression.getStats()
                },
                files: {
                    enabled: this.config.enableFileVersioning,
                    trackedFiles: this.versionedStates.size,
                    totalVersions: 0,
                    averageVersionsPerFile: 0
                },
                config: this.config
            };

            // Calculate file statistics
            let totalFileVersions = 0;
            for (const versionedState of this.versionedStates.values()) {
                totalFileVersions += versionedState.getAllVersions().length;
            }

            stats.files.totalVersions = totalFileVersions;
            stats.files.averageVersionsPerFile = 
                this.versionedStates.size > 0 
                    ? totalFileVersions / this.versionedStates.size 
                    : 0;

            return stats;
        }

        /**
         * Configure versioning settings
         */
        configure(config) {
            this.config = {
                ...this.config,
                ...config
            };

            if (window.KC.Logger) {
                window.KC.Logger.info('Versioning configured', this.config);
            }

            return this.config;
        }

        /**
         * Handle state change for auto-snapshot
         * @private
         */
        _onStateChange(path, value) {
            if (!this.config.autoSnapshot) {
                return;
            }

            this.changeCounter++;

            // Check if we should create auto-snapshot
            if (this.changeCounter >= this.config.snapshotInterval) {
                this.createGlobalSnapshot({
                    reason: 'auto_snapshot',
                    changeCount: this.changeCounter,
                    timeSinceLastSnapshot: Date.now() - this.lastSnapshotTime
                });
            }
        }

        /**
         * Handle batch state changes
         * @private
         */
        _onBatchStateChange(updates) {
            if (!this.config.autoSnapshot) {
                return;
            }

            this.changeCounter += Object.keys(updates).length;

            // Check if we should create auto-snapshot
            if (this.changeCounter >= this.config.snapshotInterval) {
                this.createGlobalSnapshot({
                    reason: 'auto_snapshot_batch',
                    changeCount: this.changeCounter,
                    batchSize: Object.keys(updates).length
                });
            }
        }

        /**
         * Handle file analysis completion
         * @private
         */
        _onFileAnalyzed(data) {
            const { fileId } = data;
            
            // Create snapshot after analysis
            this.createFileSnapshot(fileId, {
                reason: 'analysis_completed',
                analysisType: data.analysisType,
                model: data.model
            });
        }

        /**
         * Handle file categorization
         * @private
         */
        _onFileCategorized(data) {
            const { fileId } = data;
            
            // Create snapshot after categorization
            this.createFileSnapshot(fileId, {
                reason: 'categorized',
                category: data.category
            });
        }

        /**
         * Export extension state
         */
        exportState() {
            return {
                globalHistory: this.globalVersioning.exportHistory(),
                fileHistories: Array.from(this.versionedStates.entries()).map(([fileId, versionedState]) => ({
                    fileId,
                    history: versionedState.exportHistory()
                })),
                config: this.config,
                stats: this.getVersioningStats()
            };
        }

        /**
         * Import extension state
         */
        importState(state) {
            // This would require additional implementation to restore version histories
            console.warn('Import state not yet implemented');
        }
    }

    // Create and initialize extension
    const extension = new AppStateExtension();

    // Export for testing and access
    window.AppStateExtension = extension;

    // Also export the class for potential reuse
    window.AppStateExtensionClass = AppStateExtension;

})(window);
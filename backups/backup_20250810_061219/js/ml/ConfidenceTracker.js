/**
 * ConfidenceTracker - Main Service Orchestration
 * 
 * Central service for tracking confidence metrics evolution over time.
 * Integrates with EventBus for real-time updates, persists data using
 * TrackingStorage, and provides convergence analysis through ConvergenceAnalyzer.
 * 
 * @implements {ConfidenceTrackerInterface}
 */

// Temporariamente remover imports até migrar todos os arquivos
// import { ConfidenceTrackerInterface, CoordinationEvents } from '../shared/interfaces.js';
// import ConvergenceAnalyzer from './ConvergenceAnalyzer.js';
// import TrackingStorage from './TrackingStorage.js';

// Temporariamente definir interface base
class ConfidenceTrackerInterface {}

class ConfidenceTracker extends ConfidenceTrackerInterface {
    constructor(eventBus, appState) {
        super();
        
        this.eventBus = eventBus;
        this.appState = appState;
        // Usar implementações básicas temporárias
        this.storage = this.createBasicStorage();
        this.convergenceAnalyzer = this.createBasicConvergenceAnalyzer();
        
        // In-memory cache for fast access
        this.trackedFiles = new Map();
        
        // Configuration
        this.config = {
            maxHistoryPerFile: 100,
            convergenceWindow: 10,
            reanalysisThreshold: 0.15,
            minConfidenceTarget: 0.85,
            storageFlushInterval: 5000,
            enableRealTimeTracking: true
        };
        
        // Performance metrics
        this.performanceMetrics = {
            totalUpdates: 0,
            averageUpdateTime: 0,
            cacheHitRate: 0,
            lastFlush: Date.now()
        };
        
        // Initialize the tracker
        this.initialize();
    }
    
    /**
     * Initialize the tracker, load persisted data, and setup event listeners
     */
    async initialize() {
        try {
            // Load persisted tracking data
            const persistedData = await this.storage.loadAll();
            
            // Restore tracked files to memory
            for (const [fileId, data] of Object.entries(persistedData)) {
                this.trackedFiles.set(fileId, {
                    ...data,
                    lastUpdated: new Date(data.lastUpdated),
                    convergenceData: this.convergenceAnalyzer.analyzeHistory(data.history)
                });
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start periodic storage flush
            this.startStorageFlush();
            
            // Emit ready event
            // Temporariamente usar string direta até importar CoordinationEvents
            this.eventBus.emit('agent:ready', {
                agent: 'ConfidenceTracker',
                trackedFiles: this.trackedFiles.size,
                status: 'initialized'
            });
            
        } catch (error) {
            console.error('ConfidenceTracker initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Setup event listeners for confidence metrics updates
     */
    setupEventListeners() {
        // Listen for new confidence metrics
        this.eventBus.on('confidence:metrics:calculated', (data) => {
            if (this.config.enableRealTimeTracking) {
                this.updateMetrics(data.fileId, data.metrics);
            }
        });
        
        // Listen for file analysis start
        this.eventBus.on('analysis:started', (data) => {
            this.startTracking(data.fileId, data);
        });
        
        // Listen for convergence queries
        this.eventBus.on('confidence:convergence:query', (data) => {
            const history = this.getConvergenceHistory(data.fileId);
            this.eventBus.emit('confidence:convergence:response', {
                fileId: data.fileId,
                history,
                needsReanalysis: this.needsReanalysis(data.fileId)
            });
        });
    }
    
    /**
     * Start tracking a file's confidence metrics
     * @param {string} fileId - Unique file identifier
     * @param {object} initialData - Initial file data and metadata
     */
    startTracking(fileId, initialData) {
        const startTime = Date.now();
        
        try {
            // Check if already tracking
            if (this.trackedFiles.has(fileId)) {
                console.warn(`Already tracking file: ${fileId}`);
                return;
            }
            
            // Create tracking entry
            const trackingEntry = {
                fileId,
                initialData,
                history: [],
                convergenceData: null,
                startedAt: new Date(),
                lastUpdated: new Date(),
                metadata: {
                    fileName: initialData.fileName || 'Unknown',
                    fileSize: initialData.fileSize || 0,
                    fileType: initialData.fileType || 'unknown',
                    analysisCount: 0
                }
            };
            
            // Store in memory
            this.trackedFiles.set(fileId, trackingEntry);
            
            // Persist to storage
            this.storage.save(fileId, trackingEntry);
            
            // Emit tracking started event
            this.eventBus.emit('confidence:tracking:started', {
                fileId,
                timestamp: trackingEntry.startedAt
            });
            
            // Update performance metrics
            this.updatePerformanceMetrics(Date.now() - startTime);
            
        } catch (error) {
            console.error(`Failed to start tracking for ${fileId}:`, error);
            throw error;
        }
    }
    
    /**
     * Update confidence metrics for a tracked file
     * @param {string} fileId - File identifier
     * @param {ConfidenceMetrics} metrics - New confidence metrics
     */
    updateMetrics(fileId, metrics) {
        const startTime = Date.now();
        
        try {
            // Get tracking entry
            const entry = this.trackedFiles.get(fileId);
            if (!entry) {
                console.warn(`File not tracked: ${fileId}`);
                this.startTracking(fileId, { fileId });
                return this.updateMetrics(fileId, metrics);
            }
            
            // Add metrics to history
            const historyEntry = {
                metrics,
                timestamp: new Date(),
                iteration: entry.history.length + 1
            };
            
            entry.history.push(historyEntry);
            entry.lastUpdated = new Date();
            entry.metadata.analysisCount++;
            
            // Maintain history size limit
            if (entry.history.length > this.config.maxHistoryPerFile) {
                entry.history.shift();
            }
            
            // Analyze convergence with recent history
            const recentHistory = entry.history.slice(-this.config.convergenceWindow);
            entry.convergenceData = this.convergenceAnalyzer.analyzeHistory(recentHistory);
            
            // Check if converged
            if (entry.convergenceData.isConverged) {
                this.handleConvergence(fileId, entry);
            }
            
            // Emit update event
            this.eventBus.emit('confidence:metrics:updated', {
                fileId,
                metrics,
                convergenceData: entry.convergenceData,
                iteration: historyEntry.iteration
            });
            
            // Update performance metrics
            this.updatePerformanceMetrics(Date.now() - startTime);
            
        } catch (error) {
            console.error(`Failed to update metrics for ${fileId}:`, error);
            throw error;
        }
    }
    
    /**
     * Get convergence history for a file
     * @param {string} fileId - File identifier
     * @returns {array} Convergence history with analysis
     */
    getConvergenceHistory(fileId) {
        const entry = this.trackedFiles.get(fileId);
        if (!entry) {
            return [];
        }
        
        return entry.history.map((item, index) => ({
            iteration: index + 1,
            timestamp: item.timestamp,
            metrics: item.metrics,
            convergenceData: index >= this.config.convergenceWindow - 1 ?
                this.convergenceAnalyzer.analyzeHistory(
                    entry.history.slice(
                        Math.max(0, index - this.config.convergenceWindow + 1),
                        index + 1
                    )
                ) : null
        }));
    }
    
    /**
     * Determine if a file needs re-analysis
     * @param {string} fileId - File identifier
     * @returns {boolean} Whether re-analysis is needed
     */
    needsReanalysis(fileId) {
        const entry = this.trackedFiles.get(fileId);
        if (!entry || entry.history.length === 0) {
            return true;
        }
        
        // Get latest metrics
        const latestMetrics = entry.history[entry.history.length - 1].metrics;
        
        // Check if confidence is below target
        if (latestMetrics.overall < this.config.minConfidenceTarget) {
            return true;
        }
        
        // Check if not converged and showing high variance
        if (entry.convergenceData && !entry.convergenceData.isConverged) {
            const variance = entry.convergenceData.metrics.variance;
            if (variance > this.config.reanalysisThreshold) {
                return true;
            }
        }
        
        // Check if convergence prediction suggests more iterations needed
        if (latestMetrics.convergencePrediction && 
            latestMetrics.convergencePrediction.willConverge &&
            latestMetrics.convergencePrediction.estimatedIterations > 0) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle file convergence
     * @param {string} fileId - File identifier
     * @param {object} entry - Tracking entry
     */
    handleConvergence(fileId, entry) {
        // Emit convergence event
        this.eventBus.emit('confidence:converged', {
            fileId,
            finalMetrics: entry.history[entry.history.length - 1].metrics,
            iterations: entry.history.length,
            convergenceData: entry.convergenceData
        });
        
        // Update app state if needed
        if (this.appState) {
            const files = this.appState.get('files') || [];
            const fileIndex = files.findIndex(f => f.id === fileId);
            if (fileIndex !== -1) {
                files[fileIndex].converged = true;
                files[fileIndex].convergenceData = entry.convergenceData;
                this.appState.set('files', files);
            }
        }
    }
    
    /**
     * Get all tracked files summary
     * @returns {array} Summary of all tracked files
     */
    getTrackedFilesSummary() {
        const summary = [];
        
        for (const [fileId, entry] of this.trackedFiles) {
            const latestMetrics = entry.history.length > 0 ?
                entry.history[entry.history.length - 1].metrics : null;
            
            summary.push({
                fileId,
                fileName: entry.metadata.fileName,
                startedAt: entry.startedAt,
                lastUpdated: entry.lastUpdated,
                iterations: entry.history.length,
                currentConfidence: latestMetrics ? latestMetrics.overall : 0,
                isConverged: entry.convergenceData ? entry.convergenceData.isConverged : false,
                needsReanalysis: this.needsReanalysis(fileId)
            });
        }
        
        return summary;
    }
    
    /**
     * Export tracking data for a file
     * @param {string} fileId - File identifier
     * @returns {object} Complete tracking data
     */
    exportTrackingData(fileId) {
        const entry = this.trackedFiles.get(fileId);
        if (!entry) {
            return null;
        }
        
        return {
            fileId,
            metadata: entry.metadata,
            startedAt: entry.startedAt,
            lastUpdated: entry.lastUpdated,
            history: entry.history,
            convergenceData: entry.convergenceData,
            summary: {
                totalIterations: entry.history.length,
                averageConfidence: this.calculateAverageConfidence(entry.history),
                confidenceTrend: this.calculateConfidenceTrend(entry.history),
                convergenceRate: entry.convergenceData ? entry.convergenceData.metrics.rate : 0
            }
        };
    }
    
    /**
     * Clear tracking data for a file
     * @param {string} fileId - File identifier
     */
    clearTracking(fileId) {
        this.trackedFiles.delete(fileId);
        this.storage.delete(fileId);
        
        this.eventBus.emit('confidence:tracking:cleared', { fileId });
    }
    
    /**
     * Start periodic storage flush
     */
    startStorageFlush() {
        setInterval(() => {
            this.flushToStorage();
        }, this.config.storageFlushInterval);
    }
    
    /**
     * Flush all tracked data to persistent storage
     */
    async flushToStorage() {
        const startTime = Date.now();
        let savedCount = 0;
        
        for (const [fileId, entry] of this.trackedFiles) {
            try {
                await this.storage.save(fileId, entry);
                savedCount++;
            } catch (error) {
                console.error(`Failed to save tracking data for ${fileId}:`, error);
            }
        }
        
        this.performanceMetrics.lastFlush = Date.now();
        console.log(`Flushed ${savedCount} tracking entries in ${Date.now() - startTime}ms`);
    }
    
    /**
     * Update performance metrics
     * @param {number} operationTime - Time taken for operation in ms
     */
    updatePerformanceMetrics(operationTime) {
        this.performanceMetrics.totalUpdates++;
        
        // Calculate rolling average
        const currentAvg = this.performanceMetrics.averageUpdateTime;
        const totalUpdates = this.performanceMetrics.totalUpdates;
        
        this.performanceMetrics.averageUpdateTime = 
            (currentAvg * (totalUpdates - 1) + operationTime) / totalUpdates;
    }
    
    /**
     * Calculate average confidence from history
     * @param {array} history - Metrics history
     * @returns {number} Average confidence score
     */
    calculateAverageConfidence(history) {
        if (history.length === 0) return 0;
        
        const sum = history.reduce((acc, item) => acc + item.metrics.overall, 0);
        return sum / history.length;
    }
    
    /**
     * Calculate confidence trend
     * @param {array} history - Metrics history
     * @returns {string} Trend direction: 'increasing', 'decreasing', 'stable'
     */
    calculateConfidenceTrend(history) {
        if (history.length < 3) return 'stable';
        
        const recent = history.slice(-5);
        const values = recent.map(item => item.metrics.overall);
        
        let increasing = 0;
        let decreasing = 0;
        
        for (let i = 1; i < values.length; i++) {
            if (values[i] > values[i - 1]) increasing++;
            else if (values[i] < values[i - 1]) decreasing++;
        }
        
        if (increasing > decreasing * 2) return 'increasing';
        if (decreasing > increasing * 2) return 'decreasing';
        return 'stable';
    }
    
    /**
     * Get performance metrics
     * @returns {object} Current performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            trackedFiles: this.trackedFiles.size,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    
    /**
     * Estimate memory usage
     * @returns {string} Estimated memory usage
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        
        for (const entry of this.trackedFiles.values()) {
            totalSize += JSON.stringify(entry).length;
        }
        
        return `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
    }
    
    // ========= IMPLEMENTAÇÕES BÁSICAS TEMPORÁRIAS =========
    
    /**
     * Cria implementação básica de TrackingStorage usando localStorage
     * @private
     */
    createBasicStorage() {
        const STORAGE_KEY = 'ml_confidence_tracking';
        
        return {
            loadAll: async () => {
                try {
                    const stored = localStorage.getItem(STORAGE_KEY);
                    return stored ? JSON.parse(stored) : {};
                } catch (error) {
                    console.warn('ConfidenceTracker: Failed to load from localStorage', error);
                    return {};
                }
            },
            
            save: async (fileId, data) => {
                try {
                    const stored = localStorage.getItem(STORAGE_KEY);
                    const all = stored ? JSON.parse(stored) : {};
                    all[fileId] = data;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
                } catch (error) {
                    console.warn('ConfidenceTracker: Failed to save to localStorage', error);
                }
            },
            
            delete: async (fileId) => {
                try {
                    const stored = localStorage.getItem(STORAGE_KEY);
                    const all = stored ? JSON.parse(stored) : {};
                    delete all[fileId];
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
                } catch (error) {
                    console.warn('ConfidenceTracker: Failed to delete from localStorage', error);
                }
            }
        };
    }
    
    /**
     * Cria implementação básica de ConvergenceAnalyzer
     * @private
     */
    createBasicConvergenceAnalyzer() {
        return {
            analyzeHistory: (history) => {
                if (!history || history.length === 0) {
                    return {
                        isConverged: false,
                        metrics: { variance: 1, rate: 0, trend: 'unknown' }
                    };
                }
                
                // Calcula variância simplificada
                const values = history.map(h => h.metrics?.overall || 0);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
                
                // Calcula taxa de melhoria
                const rate = history.length > 1 ? 
                    (values[values.length - 1] - values[0]) / history.length : 0;
                
                // Determina tendência
                let trend = 'stable';
                if (rate > 0.01) trend = 'improving';
                else if (rate < -0.01) trend = 'declining';
                
                // Considera convergido se alta confiança e baixa variância
                const isConverged = avg >= 0.85 && variance < 0.01;
                
                return {
                    isConverged,
                    metrics: { variance, rate, trend, average: avg }
                };
            }
        };
    }
}

// Export for use in browser environment
if (typeof window !== 'undefined') {
    window.KC = window.KC || {};
    window.KC.ConfidenceTracker = ConfidenceTracker;
    
    if (window.KnowledgeConsolidator) {
        window.KnowledgeConsolidator.ConfidenceTracker = ConfidenceTracker;
    }
}
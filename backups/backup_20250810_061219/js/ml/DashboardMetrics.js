/**
 * DashboardMetrics - Efficiently calculates ML performance metrics
 * Extracted from wave8_iteration_002_mldashboard_integration.js
 * 
 * Features:
 * - Real-time metric calculation with caching
 * - Performance tracking and history
 * - Health score calculation
 * - Trend analysis
 */

class DashboardMetrics {
    constructor() {
        this.cache = new Map();
        this.lastUpdate = 0;
        this.cacheTimeout = 3000; // 3 second cache
        this.history = [];
        this.maxHistoryLength = 50; // Keep last 50 measurements
    }

    /**
     * Calculate current ML metrics with caching
     * @returns {Promise<Object>} Metrics object
     */
    async calculate() {
        const now = Date.now();
        
        // Return cached result if still valid
        if (this.cache.has('current') && (now - this.lastUpdate) < this.cacheTimeout) {
            return this.cache.get('current');
        }

        const files = window.KC?.AppState?.get('files') || [];
        const mlData = window.KC?.AppState?.ml || {};
        
        let totalConfidence = 0;
        let convergedCount = 0;
        let analyzedCount = 0;
        let improvingCount = 0;
        let stagnantCount = 0;
        let needsWorkCount = 0;

        // Process files efficiently
        for (const file of files) {
            if (file.mlConfidence && typeof file.mlConfidence.overall === 'number') {
                analyzedCount++;
                const confidence = file.mlConfidence.overall;
                totalConfidence += confidence;
                
                // Categorize by confidence level
                if (confidence >= 0.85) {
                    convergedCount++;
                } else {
                    // Check improvement status from history
                    const status = this.getFileMLStatus(file);
                    switch (status) {
                        case 'improving': improvingCount++; break;
                        case 'stagnant': stagnantCount++; break;
                        default: needsWorkCount++; break;
                    }
                }
            }
        }

        const avgConfidence = analyzedCount > 0 ? 
            (totalConfidence / analyzedCount) * 100 : 0;

        // Calculate improvement rate from recent history
        const improvementRate = this.calculateImprovementRate();
        
        // Calculate processing speed (files per minute)
        const processingSpeed = this.calculateProcessingSpeed(mlData);

        const metrics = {
            enabled: window.KC?.ML?.flags?.enabled || false,
            timestamp: now,
            
            // File counts
            total: files.length,
            analyzed: analyzedCount,
            converged: convergedCount,
            improving: improvingCount,
            stagnant: stagnantCount,
            needsWork: needsWorkCount,
            
            // Performance metrics
            avgConfidence: Math.round(avgConfidence * 100) / 100, // Round to 2 decimals
            convergenceRate: analyzedCount > 0 ? 
                Math.round((convergedCount / analyzedCount) * 100 * 100) / 100 : 0,
            improvementRate: Math.round(improvementRate * 100) / 100,
            processingSpeed: Math.round(processingSpeed * 100) / 100,
            
            // Health indicators
            health: this.calculateSystemHealth(avgConfidence, improvementRate),
            lastIterationTime: mlData.lastIterationTime || null,
            activeIterations: mlData.activeIterations || 0
        };

        // Cache result
        this.cache.set('current', metrics);
        this.lastUpdate = now;
        
        // Add to history
        this.addToHistory(metrics);

        return metrics;
    }

    /**
     * Get ML status for a specific file
     * @param {Object} file - File object
     * @returns {string} Status: improving, stagnant, needs-work
     */
    getFileMLStatus(file) {
        const history = file.mlHistory || [];
        if (history.length < 2) return 'needs-work';
        
        const recent = history.slice(-3); // Last 3 measurements
        if (recent.length < 2) return 'needs-work';
        
        const deltas = [];
        for (let i = 1; i < recent.length; i++) {
            deltas.push(recent[i].overall - recent[i-1].overall);
        }
        
        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        
        if (avgDelta > 0.02) return 'improving'; // 2% improvement
        if (Math.abs(avgDelta) < 0.01) return 'stagnant'; // Less than 1% change
        return 'needs-work';
    }

    /**
     * Calculate improvement rate from history
     * @returns {number} Improvement percentage
     */
    calculateImprovementRate() {
        if (this.history.length < 2) return 0;
        
        const recent = this.history.slice(-5); // Last 5 measurements
        if (recent.length < 2) return 0;
        
        const first = recent[0].avgConfidence;
        const last = recent[recent.length - 1].avgConfidence;
        
        if (first === 0) return 0;
        return ((last - first) / first) * 100;
    }

    /**
     * Calculate processing speed (files per minute)
     * @param {Object} mlData - ML data from AppState
     * @returns {number} Files per minute
     */
    calculateProcessingSpeed(mlData) {
        const processingLog = mlData.processingLog || [];
        if (processingLog.length === 0) return 0;
        
        // Count files processed in last 5 minutes
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        const recentProcessing = processingLog.filter(entry => 
            entry.timestamp > fiveMinutesAgo
        );
        
        return (recentProcessing.length / 5) || 0; // Files per minute
    }

    /**
     * Calculate overall system health score
     * @param {number} avgConfidence - Average confidence
     * @param {number} improvementRate - Improvement rate
     * @returns {Object} Health object with score and status
     */
    calculateSystemHealth(avgConfidence, improvementRate) {
        let score = 0;
        
        // Confidence contribution (60%)
        score += (avgConfidence / 100) * 0.6;
        
        // Improvement contribution (40%)
        const normalizedImprovement = Math.max(0, Math.min(improvementRate / 10, 1));
        score += normalizedImprovement * 0.4;
        
        score = Math.max(0, Math.min(score, 1)); // Clamp to 0-1
        
        let status = 'poor';
        if (score >= 0.8) status = 'excellent';
        else if (score >= 0.6) status = 'good';
        else if (score >= 0.4) status = 'fair';
        
        return {
            score: Math.round(score * 100),
            status,
            color: this.getHealthColor(status)
        };
    }

    /**
     * Get color for health status
     * @param {string} status - Health status
     * @returns {string} CSS color value
     */
    getHealthColor(status) {
        const colors = {
            excellent: 'var(--ml-confidence-high-primary)',
            good: 'var(--ml-confidence-medium-primary)', 
            fair: 'var(--ml-confidence-low-primary)',
            poor: 'var(--ml-confidence-uncertain-primary)'
        };
        return colors[status] || colors.poor;
    }

    /**
     * Add metrics to history
     * @param {Object} metrics - Metrics to add
     */
    addToHistory(metrics) {
        this.history.push({
            timestamp: metrics.timestamp,
            avgConfidence: metrics.avgConfidence,
            convergenceRate: metrics.convergenceRate,
            improvementRate: metrics.improvementRate
        });

        // Trim history if too long
        if (this.history.length > this.maxHistoryLength) {
            this.history = this.history.slice(-this.maxHistoryLength);
        }
    }

    /**
     * Get detailed metrics for expanded view
     * @returns {Object} Detailed metrics
     */
    getDetailed() {
        const current = this.cache.get('current');
        if (!current) return {};

        return {
            ...current,
            breakdown: {
                byConfidence: {
                    high: current.converged,
                    medium: current.improving,
                    low: current.stagnant,
                    uncertain: current.needsWork
                },
                byStatus: {
                    converged: current.converged,
                    improving: current.improving, 
                    stagnant: current.stagnant,
                    needsWork: current.needsWork
                }
            },
            trends: this.calculateTrends()
        };
    }

    /**
     * Calculate trend data for charts
     * @returns {Object} Trend data
     */
    calculateTrends() {
        const recent = this.history.slice(-10); // Last 10 measurements
        
        return {
            confidence: recent.map(h => h.avgConfidence),
            convergence: recent.map(h => h.convergenceRate),
            improvement: recent.map(h => h.improvementRate),
            timestamps: recent.map(h => h.timestamp)
        };
    }

    /**
     * Get history data
     * @param {number} limit - Maximum number of entries
     * @returns {Array} History entries
     */
    getHistory(limit = 20) {
        return this.history.slice(-limit);
    }

    /**
     * Clear cache and force recalculation
     */
    invalidateCache() {
        this.cache.clear();
        this.lastUpdate = 0;
    }
}

// Register with KC
if (window.KC) {
    window.KC.DashboardMetrics = DashboardMetrics;
    console.log('[DashboardMetrics] Registered with KC');
}
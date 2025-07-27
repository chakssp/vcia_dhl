/**
 * StreamConvergenceDetector.js
 * Real-time convergence detection with sliding windows
 */

export class StreamConvergenceDetector {
  constructor(options = {}) {
    this.options = {
      windowSize: 1000,           // 1 second window
      minDataPoints: 3,           // Minimum points for detection
      threshold: 0.85,            // Convergence threshold
      stabilityWindow: 3,         // Number of stable windows for convergence
      maxDelta: 0.02,            // Max change between windows
      adaptiveThreshold: true,    // Adjust threshold based on variance
      ...options
    };
    
    // Per-file tracking
    this.fileData = new Map();
    
    // Global statistics
    this.globalStats = {
      totalFiles: 0,
      convergedFiles: 0,
      avgIterations: 0,
      avgConfidence: 0
    };
    
    // Sliding window for global metrics
    this.metricsWindow = [];
    this.windowStart = Date.now();
  }
  
  /**
   * Add data point and check convergence
   */
  addDataPoint(fileId, confidence, timestamp = Date.now()) {
    // Get or create file data
    let data = this.fileData.get(fileId);
    if (!data) {
      data = {
        points: [],
        windows: [],
        converged: false,
        convergenceTime: null,
        stats: {
          mean: 0,
          variance: 0,
          trend: 0
        }
      };
      this.fileData.set(fileId, data);
      this.globalStats.totalFiles++;
    }
    
    // Add point
    data.points.push({ confidence, timestamp });
    
    // Update sliding window
    this.updateWindow(data, confidence, timestamp);
    
    // Check convergence
    const result = this.checkConvergence(data);
    
    if (result.converged && !data.converged) {
      // First time convergence
      data.converged = true;
      data.convergenceTime = timestamp;
      data.convergenceInfo = result;
      this.globalStats.convergedFiles++;
      
      // Update global metrics
      this.updateGlobalMetrics();
    }
    
    return result;
  }
  
  /**
   * Update sliding window for file
   */
  updateWindow(data, confidence, timestamp) {
    // Remove old points outside window
    const cutoff = timestamp - this.options.windowSize;
    data.points = data.points.filter(p => p.timestamp > cutoff);
    
    // Calculate window statistics
    if (data.points.length >= this.options.minDataPoints) {
      const stats = this.calculateWindowStats(data.points);
      
      // Add to window history
      data.windows.push({
        timestamp,
        stats,
        confidence
      });
      
      // Keep only recent windows
      if (data.windows.length > this.options.stabilityWindow * 2) {
        data.windows = data.windows.slice(-this.options.stabilityWindow * 2);
      }
      
      data.stats = stats;
    }
  }
  
  /**
   * Calculate statistics for window
   */
  calculateWindowStats(points) {
    const values = points.map(p => p.confidence);
    const n = values.length;
    
    // Mean
    const mean = values.reduce((a, b) => a + b, 0) / n;
    
    // Variance
    const variance = values.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / n;
    
    // Standard deviation
    const stdDev = Math.sqrt(variance);
    
    // Trend (linear regression slope)
    const trend = this.calculateTrend(points);
    
    // Range
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    return {
      mean,
      variance,
      stdDev,
      trend,
      min,
      max,
      range,
      count: n
    };
  }
  
  /**
   * Calculate trend using linear regression
   */
  calculateTrend(points) {
    if (points.length < 2) return 0;
    
    // Normalize timestamps
    const startTime = points[0].timestamp;
    const normalized = points.map(p => ({
      x: (p.timestamp - startTime) / 1000, // Convert to seconds
      y: p.confidence
    }));
    
    // Linear regression
    const n = normalized.length;
    const sumX = normalized.reduce((sum, p) => sum + p.x, 0);
    const sumY = normalized.reduce((sum, p) => sum + p.y, 0);
    const sumXY = normalized.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = normalized.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const denominator = n * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 0.0001) return 0;
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    
    return slope;
  }
  
  /**
   * Check if convergence achieved
   */
  checkConvergence(data) {
    if (data.windows.length < this.options.stabilityWindow) {
      return {
        converged: false,
        reason: 'insufficient_windows',
        windows: data.windows.length,
        required: this.options.stabilityWindow
      };
    }
    
    // Get recent windows
    const recentWindows = data.windows.slice(-this.options.stabilityWindow);
    
    // Calculate adaptive threshold if enabled
    const threshold = this.options.adaptiveThreshold ?
      this.calculateAdaptiveThreshold(recentWindows) :
      this.options.threshold;
    
    // Check if all windows meet threshold
    const allAboveThreshold = recentWindows.every(w => 
      w.stats.mean >= threshold
    );
    
    if (!allAboveThreshold) {
      return {
        converged: false,
        reason: 'below_threshold',
        currentMean: recentWindows[recentWindows.length - 1].stats.mean,
        threshold
      };
    }
    
    // Check stability (low variance between windows)
    const windowMeans = recentWindows.map(w => w.stats.mean);
    const windowVariance = this.calculateVariance(windowMeans);
    
    if (windowVariance > this.options.maxDelta * this.options.maxDelta) {
      return {
        converged: false,
        reason: 'unstable',
        variance: windowVariance,
        maxAllowed: this.options.maxDelta * this.options.maxDelta
      };
    }
    
    // Check trend (should be flat or positive)
    const avgTrend = recentWindows.reduce((sum, w) => 
      sum + w.stats.trend, 0) / recentWindows.length;
    
    if (avgTrend < -0.01) { // Declining trend
      return {
        converged: false,
        reason: 'declining_trend',
        trend: avgTrend
      };
    }
    
    // All checks passed
    return {
      converged: true,
      iterations: data.points.length,
      confidence: windowMeans[windowMeans.length - 1],
      stability: 1 - Math.sqrt(windowVariance),
      trend: avgTrend,
      threshold,
      windows: data.windows.length
    };
  }
  
  /**
   * Calculate adaptive threshold based on data characteristics
   */
  calculateAdaptiveThreshold(windows) {
    // Use statistical properties to adjust threshold
    const means = windows.map(w => w.stats.mean);
    const globalMean = means.reduce((a, b) => a + b, 0) / means.length;
    const globalStdDev = Math.sqrt(this.calculateVariance(means));
    
    // Higher variance = lower threshold (more forgiving)
    const varianceAdjustment = Math.min(0.1, globalStdDev * 2);
    
    // Higher mean = higher threshold (stricter)
    const meanAdjustment = globalMean > 0.8 ? 0.05 : 0;
    
    return Math.max(0.7, Math.min(0.95,
      this.options.threshold - varianceAdjustment + meanAdjustment
    ));
  }
  
  /**
   * Calculate variance of array
   */
  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / values.length;
  }
  
  /**
   * Update global metrics
   */
  updateGlobalMetrics() {
    let totalIterations = 0;
    let totalConfidence = 0;
    let count = 0;
    
    this.fileData.forEach(data => {
      if (data.converged) {
        totalIterations += data.convergenceInfo.iterations;
        totalConfidence += data.convergenceInfo.confidence;
        count++;
      }
    });
    
    if (count > 0) {
      this.globalStats.avgIterations = totalIterations / count;
      this.globalStats.avgConfidence = totalConfidence / count;
    }
    
    // Add to metrics window
    this.metricsWindow.push({
      timestamp: Date.now(),
      convergenceRate: this.globalStats.convergedFiles / this.globalStats.totalFiles,
      avgIterations: this.globalStats.avgIterations,
      avgConfidence: this.globalStats.avgConfidence
    });
    
    // Clean old metrics
    const cutoff = Date.now() - 60000; // Keep 1 minute
    this.metricsWindow = this.metricsWindow.filter(m => m.timestamp > cutoff);
  }
  
  /**
   * Get convergence status for file
   */
  getStatus(fileId) {
    const data = this.fileData.get(fileId);
    if (!data) return null;
    
    return {
      converged: data.converged,
      convergenceTime: data.convergenceTime,
      convergenceInfo: data.convergenceInfo,
      currentStats: data.stats,
      windowCount: data.windows.length,
      dataPoints: data.points.length
    };
  }
  
  /**
   * Get global convergence metrics
   */
  getGlobalMetrics() {
    return {
      ...this.globalStats,
      convergenceRate: this.globalStats.totalFiles > 0 ?
        this.globalStats.convergedFiles / this.globalStats.totalFiles : 0,
      recentMetrics: this.metricsWindow.slice(-10)
    };
  }
  
  /**
   * Create snapshot for persistence
   */
  snapshot() {
    return {
      timestamp: Date.now(),
      fileData: Object.fromEntries(
        Array.from(this.fileData.entries()).map(([fileId, data]) => [
          fileId,
          {
            converged: data.converged,
            convergenceTime: data.convergenceTime,
            convergenceInfo: data.convergenceInfo,
            stats: data.stats,
            windowCount: data.windows.length
          }
        ])
      ),
      globalStats: this.globalStats
    };
  }
  
  /**
   * Restore from snapshot
   */
  restore(snapshot) {
    // Clear current data
    this.fileData.clear();
    
    // Restore file data
    Object.entries(snapshot.fileData).forEach(([fileId, data]) => {
      this.fileData.set(fileId, {
        points: [], // Don't restore raw points
        windows: [], // Don't restore windows
        converged: data.converged,
        convergenceTime: data.convergenceTime,
        convergenceInfo: data.convergenceInfo,
        stats: data.stats
      });
    });
    
    // Restore global stats
    this.globalStats = { ...snapshot.globalStats };
  }
  
  /**
   * Reset detector
   */
  reset() {
    this.fileData.clear();
    this.globalStats = {
      totalFiles: 0,
      convergedFiles: 0,
      avgIterations: 0,
      avgConfidence: 0
    };
    this.metricsWindow = [];
  }
}

export default StreamConvergenceDetector;
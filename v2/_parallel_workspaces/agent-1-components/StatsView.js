/**
 * Statistics View for KC V2
 * Displays comprehensive statistics and analytics
 */

import { EventBus } from '../../core/EventBus.js';
import { AppState } from '../../core/AppState.js';

export class StatsView {
  constructor(api) {
    this.api = api;
    this.container = null;
    this.charts = {};
    this.refreshInterval = null;
    this.timeRange = '7d'; // Default to last 7 days
  }

  initialize() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    EventBus.on('view:stats:show', () => this.render());
    EventBus.on('stats:update', (data) => this.updateStats(data));
    EventBus.on('files:analyzed', () => this.refreshStats());
  }

  render() {
    this.container = document.getElementById('view-container');
    this.container.innerHTML = this.getTemplate();
    this.attachEventHandlers();
    this.loadStats();
    this.startAutoRefresh();
  }

  getTemplate() {
    return `
      <div id="stats-view" class="view">
        <div class="view-header">
          <h2 class="view-title">Statistics & Analytics</h2>
          <div class="view-actions">
            <select id="time-range" class="time-range-select">
              <option value="1d">Last 24 hours</option>
              <option value="7d" selected>Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button class="btn btn-secondary" id="btn-export-stats">
              Export Stats
            </button>
            <button class="btn btn-primary" id="btn-refresh-stats">
              Refresh
            </button>
          </div>
        </div>
        
        <div class="view-content">
          <div class="stats-container">
            <!-- Overview Cards -->
            <div class="stats-overview">
              <div class="stat-card">
                <div class="stat-icon">📁</div>
                <div class="stat-content">
                  <div class="stat-value" id="total-files">0</div>
                  <div class="stat-label">Total Files</div>
                  <div class="stat-change" id="files-change">--</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon">🧪</div>
                <div class="stat-content">
                  <div class="stat-value" id="analyzed-files">0</div>
                  <div class="stat-label">Analyzed</div>
                  <div class="stat-change" id="analyzed-change">--</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon">🏷️</div>
                <div class="stat-content">
                  <div class="stat-value" id="total-categories">0</div>
                  <div class="stat-label">Categories</div>
                  <div class="stat-change" id="categories-change">--</div>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon">💾</div>
                <div class="stat-content">
                  <div class="stat-value" id="total-size">0 MB</div>
                  <div class="stat-label">Total Size</div>
                  <div class="stat-change" id="size-change">--</div>
                </div>
              </div>
            </div>
            
            <!-- Charts Section -->
            <div class="stats-charts">
              <!-- File Discovery Timeline -->
              <div class="chart-container">
                <h3 class="chart-title">Discovery Timeline</h3>
                <div class="chart-wrapper">
                  <canvas id="discovery-timeline-chart"></canvas>
                </div>
              </div>
              
              <!-- Analysis Progress -->
              <div class="chart-container">
                <h3 class="chart-title">Analysis Progress</h3>
                <div class="progress-chart">
                  <div class="progress-ring">
                    <svg viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#e0e0e0" stroke-width="10"/>
                      <circle id="progress-circle" cx="60" cy="60" r="50" fill="none" 
                        stroke="#4CAF50" stroke-width="10" stroke-dasharray="314" 
                        stroke-dashoffset="314" transform="rotate(-90 60 60)"/>
                    </svg>
                    <div class="progress-text">
                      <span id="analysis-percentage">0%</span>
                    </div>
                  </div>
                  <div class="progress-stats">
                    <div class="progress-stat">
                      <span class="label">Analyzed</span>
                      <span class="value" id="analyzed-count">0</span>
                    </div>
                    <div class="progress-stat">
                      <span class="label">Pending</span>
                      <span class="value" id="pending-count">0</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Category Distribution -->
              <div class="chart-container">
                <h3 class="chart-title">Category Distribution</h3>
                <div class="chart-wrapper">
                  <canvas id="category-distribution-chart"></canvas>
                </div>
              </div>
              
              <!-- File Types -->
              <div class="chart-container">
                <h3 class="chart-title">File Types</h3>
                <div class="chart-wrapper">
                  <canvas id="file-types-chart"></canvas>
                </div>
              </div>
            </div>
            
            <!-- Detailed Stats Tables -->
            <div class="stats-details">
              <!-- Top Categories -->
              <div class="detail-section">
                <h3>Top Categories</h3>
                <table class="stats-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Files</th>
                      <th>Size</th>
                      <th>Avg. Score</th>
                    </tr>
                  </thead>
                  <tbody id="top-categories-table">
                    <!-- Rows will be inserted here -->
                  </tbody>
                </table>
              </div>
              
              <!-- Recent Activity -->
              <div class="detail-section">
                <h3>Recent Activity</h3>
                <div class="activity-timeline" id="activity-timeline">
                  <!-- Activity items will be inserted here -->
                </div>
              </div>
              
              <!-- Performance Metrics -->
              <div class="detail-section">
                <h3>Performance Metrics</h3>
                <div class="metrics-grid">
                  <div class="metric-item">
                    <span class="metric-label">Avg. Analysis Time</span>
                    <span class="metric-value" id="avg-analysis-time">-- ms</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">API Response Time</span>
                    <span class="metric-value" id="api-response-time">-- ms</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Cache Hit Rate</span>
                    <span class="metric-value" id="cache-hit-rate">--%</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Error Rate</span>
                    <span class="metric-value" id="error-rate">--%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventHandlers() {
    document.getElementById('time-range').addEventListener('change', 
      (e) => this.updateTimeRange(e.target.value));
    
    document.getElementById('btn-export-stats').addEventListener('click', 
      () => this.exportStats());
    
    document.getElementById('btn-refresh-stats').addEventListener('click', 
      () => this.refreshStats());
  }

  async loadStats() {
    try {
      // Get current stats
      const stats = await this.calculateStats();
      
      // Update overview cards
      this.updateOverviewCards(stats);
      
      // Update charts
      this.updateCharts(stats);
      
      // Update detailed tables
      this.updateDetailedStats(stats);
      
      // Update activity timeline
      this.updateActivityTimeline(stats);
      
      // Update performance metrics
      this.updatePerformanceMetrics(stats);
      
    } catch (error) {
      console.error('Failed to load stats:', error);
      EventBus.emit('notification:error', {
        message: 'Failed to load statistics'
      });
    }
  }

  async calculateStats() {
    const files = AppState.get('files') || [];
    const categories = AppState.get('categories') || [];
    const settings = AppState.get('settings') || {};
    
    // Calculate basic stats
    const totalFiles = files.length;
    const analyzedFiles = files.filter(f => f.analyzed).length;
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    
    // Calculate category distribution
    const categoryStats = {};
    files.forEach(file => {
      (file.categories || []).forEach(cat => {
        if (!categoryStats[cat]) {
          categoryStats[cat] = { count: 0, size: 0, scores: [] };
        }
        categoryStats[cat].count++;
        categoryStats[cat].size += file.size || 0;
        if (file.relevanceScore) {
          categoryStats[cat].scores.push(file.relevanceScore);
        }
      });
    });
    
    // Calculate file type distribution
    const fileTypes = {};
    files.forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    
    // Get historical data for trends
    const history = await this.getHistoricalData();
    
    return {
      overview: {
        totalFiles,
        analyzedFiles,
        totalCategories: categories.length,
        totalSize,
        pendingFiles: totalFiles - analyzedFiles,
        analysisPercentage: totalFiles > 0 ? 
          Math.round((analyzedFiles / totalFiles) * 100) : 0
      },
      categories: categoryStats,
      fileTypes,
      history,
      timeRange: this.timeRange
    };
  }

  updateOverviewCards(stats) {
    const { overview } = stats;
    
    // Update values
    document.getElementById('total-files').textContent = overview.totalFiles;
    document.getElementById('analyzed-files').textContent = overview.analyzedFiles;
    document.getElementById('total-categories').textContent = overview.totalCategories;
    document.getElementById('total-size').textContent = this.formatFileSize(overview.totalSize);
    
    // Update changes (would compare with previous period)
    // For now, just show placeholders
    document.getElementById('files-change').textContent = '+12%';
    document.getElementById('files-change').className = 'stat-change positive';
    
    document.getElementById('analyzed-change').textContent = '+25%';
    document.getElementById('analyzed-change').className = 'stat-change positive';
    
    document.getElementById('categories-change').textContent = '+3';
    document.getElementById('categories-change').className = 'stat-change positive';
    
    document.getElementById('size-change').textContent = '+5.2 MB';
    document.getElementById('size-change').className = 'stat-change positive';
  }

  updateCharts(stats) {
    // Update progress circle
    const percentage = stats.overview.analysisPercentage;
    const circle = document.getElementById('progress-circle');
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    document.getElementById('analysis-percentage').textContent = `${percentage}%`;
    document.getElementById('analyzed-count').textContent = stats.overview.analyzedFiles;
    document.getElementById('pending-count').textContent = stats.overview.pendingFiles;
    
    // In a real implementation, these would use Chart.js or similar
    this.renderDiscoveryTimeline(stats);
    this.renderCategoryDistribution(stats);
    this.renderFileTypesChart(stats);
  }

  renderDiscoveryTimeline(stats) {
    // Placeholder for timeline chart
    const canvas = document.getElementById('discovery-timeline-chart');
    const ctx = canvas.getContext('2d');
    
    // Simple line chart simulation
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Draw sample data
    const points = [10, 25, 40, 55, 70, 80, 95];
    const width = canvas.width;
    const height = canvas.height;
    
    points.forEach((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - (point / 100) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  }

  renderCategoryDistribution(stats) {
    // Placeholder for pie chart
    const canvas = document.getElementById('category-distribution-chart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    // Simple pie chart simulation
    const categories = Object.entries(stats.categories)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    const total = categories.reduce((sum, [_, data]) => sum + data.count, 0);
    let currentAngle = -Math.PI / 2;
    
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0'];
    
    categories.forEach(([name, data], index) => {
      const sliceAngle = (data.count / total) * 2 * Math.PI;
      
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 80, currentAngle, currentAngle + sliceAngle);
      ctx.lineTo(canvas.width / 2, canvas.height / 2);
      ctx.fill();
      
      currentAngle += sliceAngle;
    });
  }

  renderFileTypesChart(stats) {
    // Placeholder for bar chart
    const canvas = document.getElementById('file-types-chart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    // Simple bar chart simulation
    const types = Object.entries(stats.fileTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const maxCount = Math.max(...types.map(([_, count]) => count));
    const barWidth = (canvas.width - 40) / types.length;
    
    ctx.fillStyle = '#2196F3';
    
    types.forEach(([type, count], index) => {
      const barHeight = (count / maxCount) * (canvas.height - 40);
      const x = 20 + index * barWidth;
      const y = canvas.height - barHeight - 20;
      
      ctx.fillRect(x + 10, y, barWidth - 20, barHeight);
      
      // Draw labels
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(type, x + barWidth / 2, canvas.height - 5);
      
      ctx.fillStyle = '#2196F3';
    });
  }

  updateDetailedStats(stats) {
    // Update top categories table
    const tbody = document.getElementById('top-categories-table');
    const topCategories = Object.entries(stats.categories)
      .map(([name, data]) => ({
        name,
        count: data.count,
        size: data.size,
        avgScore: data.scores.length > 0 ? 
          Math.round(data.scores.reduce((a, b) => a + b) / data.scores.length) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    tbody.innerHTML = topCategories.map(cat => `
      <tr>
        <td>${cat.name}</td>
        <td>${cat.count}</td>
        <td>${this.formatFileSize(cat.size)}</td>
        <td>${cat.avgScore}%</td>
      </tr>
    `).join('');
  }

  updateActivityTimeline(stats) {
    const timeline = document.getElementById('activity-timeline');
    
    // Generate sample activity data
    const activities = [
      { time: '2 minutes ago', action: 'Analyzed', details: '5 files completed' },
      { time: '15 minutes ago', action: 'Discovered', details: '23 new files found' },
      { time: '1 hour ago', action: 'Categorized', details: '12 files organized' },
      { time: '3 hours ago', action: 'Exported', details: 'Results to Qdrant' },
      { time: 'Yesterday', action: 'Imported', details: '156 files from Obsidian' }
    ];
    
    timeline.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-time">${activity.time}</div>
        <div class="activity-content">
          <span class="activity-action">${activity.action}</span>
          <span class="activity-details">${activity.details}</span>
        </div>
      </div>
    `).join('');
  }

  updatePerformanceMetrics(stats) {
    // These would be calculated from actual performance data
    document.getElementById('avg-analysis-time').textContent = '245 ms';
    document.getElementById('api-response-time').textContent = '120 ms';
    document.getElementById('cache-hit-rate').textContent = '87%';
    document.getElementById('error-rate').textContent = '0.3%';
  }

  async getHistoricalData() {
    // This would fetch historical data based on time range
    // For now, return sample data
    return {
      daily: {
        files: [10, 15, 25, 40, 55, 70, 85],
        analyzed: [5, 10, 20, 35, 50, 65, 80]
      }
    };
  }

  updateTimeRange(range) {
    this.timeRange = range;
    this.loadStats();
  }

  async refreshStats() {
    EventBus.emit('notification:info', { message: 'Refreshing statistics...' });
    await this.loadStats();
    EventBus.emit('notification:success', { message: 'Statistics updated' });
  }

  async exportStats() {
    try {
      const stats = await this.calculateStats();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `kc-stats-${timestamp}.json`;
      
      const content = JSON.stringify(stats, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      EventBus.emit('notification:success', {
        message: 'Statistics exported successfully'
      });
    } catch (error) {
      EventBus.emit('notification:error', {
        message: `Export failed: ${error.message}`
      });
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  }

  startAutoRefresh() {
    // Refresh stats every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadStats();
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  destroy() {
    this.stopAutoRefresh();
  }

  // Additional statistical methods
  calculateTrend(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  getAverageFileSize() {
    const files = AppState.get('files') || [];
    if (files.length === 0) return 0;
    
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    return totalSize / files.length;
  }

  getMostActiveCategories(limit = 5) {
    const stats = this.calculateStats();
    return Object.entries(stats.categories)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([name, data]) => ({ name, ...data }));
  }

  getAnalysisVelocity() {
    // Calculate files analyzed per day
    const files = AppState.get('files') || [];
    const analyzedFiles = files.filter(f => f.analyzed && f.analyzedAt);
    
    if (analyzedFiles.length === 0) return 0;
    
    const dates = analyzedFiles.map(f => new Date(f.analyzedAt).toDateString());
    const uniqueDates = new Set(dates).size;
    
    return analyzedFiles.length / uniqueDates;
  }
}
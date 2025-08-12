/**
 * DashboardCharts - Lightweight chart renderer for ML metrics visualization
 * Extracted from wave8_iteration_002_mldashboard_integration.js
 * 
 * Features:
 * - Canvas-based rendering for performance
 * - Smooth animations with 60fps target
 * - High DPI support
 * - Memory-efficient implementation
 */

class DashboardCharts {
    constructor() {
        this.charts = new Map();
        this.animationFrames = new Map();
        this.performanceMonitor = window.KC?.ML?.MLPerformanceMonitor || { startMeasure: () => {}, endMeasure: () => 0 };
    }

    /**
     * Create a trend line chart
     * @param {string} id - Chart ID
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Chart options
     */
    createTrendChart(id, container, options = {}) {
        const canvas = document.createElement('canvas');
        canvas.id = `chart-${id}`;
        canvas.width = options.width || 300;
        canvas.height = options.height || 100;
        
        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        canvas.width *= dpr;
        canvas.height *= dpr;
        canvas.style.width = `${options.width || 300}px`;
        canvas.style.height = `${options.height || 100}px`;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        container.appendChild(canvas);
        
        const chart = {
            canvas,
            ctx,
            options: {
                color: options.color || '#10B981',
                backgroundColor: options.backgroundColor || 'transparent',
                lineWidth: options.lineWidth || 2,
                pointRadius: options.pointRadius || 0,
                animate: options.animate !== false,
                ...options
            },
            data: [],
            lastRender: 0
        };
        
        this.charts.set(id, chart);
        return chart;
    }

    /**
     * Update chart data with smooth animation
     * @param {string} id - Chart ID
     * @param {Array} data - Data points
     */
    updateChart(id, data) {
        const chart = this.charts.get(id);
        if (!chart) return;

        this.performanceMonitor.startMeasure(`chart-update-${id}`);
        
        chart.data = data;
        
        if (chart.options.animate) {
            this.animateChart(id);
        } else {
            this.renderChart(id);
        }
    }

    /**
     * Animate chart with smooth transitions
     * @param {string} id - Chart ID
     */
    animateChart(id) {
        const chart = this.charts.get(id);
        if (!chart) return;

        // Cancel existing animation
        if (this.animationFrames.has(id)) {
            cancelAnimationFrame(this.animationFrames.get(id));
        }

        const startTime = performance.now();
        const duration = 300; // 300ms animation

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.renderChart(id, eased);

            if (progress < 1) {
                const frameId = requestAnimationFrame(animate);
                this.animationFrames.set(id, frameId);
            } else {
                this.animationFrames.delete(id);
                this.performanceMonitor.endMeasure(`chart-update-${id}`);
            }
        };

        const frameId = requestAnimationFrame(animate);
        this.animationFrames.set(id, frameId);
    }

    /**
     * Render chart to canvas
     * @param {string} id - Chart ID
     * @param {number} progress - Animation progress (0-1)
     */
    renderChart(id, progress = 1) {
        const chart = this.charts.get(id);
        if (!chart || !chart.data.length) return;

        const { ctx, options } = chart;
        const { width, height } = ctx.canvas;
        const dpr = window.devicePixelRatio || 1;
        
        // Clear canvas
        ctx.clearRect(0, 0, width / dpr, height / dpr);
        
        // Fill background if specified
        if (options.backgroundColor !== 'transparent') {
            ctx.fillStyle = options.backgroundColor;
            ctx.fillRect(0, 0, width / dpr, height / dpr);
        }

        const data = chart.data;
        const padding = 20;
        const chartWidth = (width / dpr) - (padding * 2);
        const chartHeight = (height / dpr) - (padding * 2);

        // Calculate scales
        const maxValue = Math.max(...data, 1);
        const minValue = Math.min(...data, 0);
        const valueRange = maxValue - minValue || 1;

        // Draw line
        ctx.strokeStyle = options.color;
        ctx.lineWidth = options.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            
            // Apply animation progress
            const animatedY = padding + chartHeight - (((value - minValue) / valueRange) * chartHeight * progress);
            
            if (index === 0) {
                ctx.moveTo(x, animatedY);
            } else {
                ctx.lineTo(x, animatedY);
            }
        });

        ctx.stroke();

        // Draw points if enabled
        if (options.pointRadius > 0) {
            ctx.fillStyle = options.color;
            
            data.forEach((value, index) => {
                const x = padding + (index / (data.length - 1)) * chartWidth;
                const y = padding + chartHeight - (((value - minValue) / valueRange) * chartHeight * progress);
                
                ctx.beginPath();
                ctx.arc(x, y, options.pointRadius, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
    }

    /**
     * Get all charts for modal view
     * @returns {Object} Chart configurations
     */
    getAll() {
        const chartData = {};
        
        this.charts.forEach((chart, id) => {
            chartData[id] = {
                data: chart.data,
                options: chart.options,
                lastUpdate: chart.lastRender
            };
        });

        return chartData;
    }

    /**
     * Destroy a chart and cleanup resources
     * @param {string} id - Chart ID
     */
    destroyChart(id) {
        // Cancel animation
        if (this.animationFrames.has(id)) {
            cancelAnimationFrame(this.animationFrames.get(id));
            this.animationFrames.delete(id);
        }

        // Remove chart
        const chart = this.charts.get(id);
        if (chart && chart.canvas.parentNode) {
            chart.canvas.parentNode.removeChild(chart.canvas);
        }

        this.charts.delete(id);
    }

    /**
     * Cleanup all charts
     */
    destroy() {
        this.charts.forEach((_, id) => {
            this.destroyChart(id);
        });
    }
}

// Register with KC
if (window.KC) {
    window.KC.DashboardCharts = DashboardCharts;
    console.log('[DashboardCharts] Registered with KC');
}
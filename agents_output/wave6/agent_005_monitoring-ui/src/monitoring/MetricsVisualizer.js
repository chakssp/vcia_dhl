/**
 * MetricsVisualizer - Creates and manages dashboard visualizations
 * Uses vanilla JS to create charts without external dependencies
 */

class MetricsVisualizer {
    constructor() {
        this.charts = new Map();
        this.theme = 'light';
        this.colors = {
            light: {
                background: '#ffffff',
                text: '#333333',
                grid: '#e0e0e0',
                axis: '#666666'
            },
            dark: {
                background: '#1e1e1e',
                text: '#ffffff',
                grid: '#333333',
                axis: '#999999'
            }
        };
    }

    createLineChart(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const chart = {
            type: 'line',
            container,
            canvas: null,
            ctx: null,
            data: [],
            options: {
                width: options.width || 400,
                height: options.height || 200,
                color: options.color || '#2196F3',
                label: options.label || 'Value',
                showGrid: options.showGrid || false,
                animate: options.animate !== false,
                padding: { top: 20, right: 20, bottom: 30, left: 50 }
            }
        };

        // Create canvas
        chart.canvas = this.createCanvas(container, chart.options.width, chart.options.height);
        chart.ctx = chart.canvas.getContext('2d');

        this.charts.set(containerId, chart);
        this.drawLineChart(chart);
    }

    createAreaChart(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const chart = {
            type: 'area',
            container,
            canvas: null,
            ctx: null,
            data: [],
            options: {
                width: options.width || 400,
                height: options.height || 200,
                color: options.color || '#2196F3',
                label: options.label || 'Value',
                showGrid: options.showGrid !== false,
                animate: options.animate !== false,
                padding: { top: 20, right: 20, bottom: 30, left: 50 }
            }
        };

        chart.canvas = this.createCanvas(container, chart.options.width, chart.options.height);
        chart.ctx = chart.canvas.getContext('2d');

        this.charts.set(containerId, chart);
        this.drawAreaChart(chart);
    }

    createBarChart(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const chart = {
            type: 'bar',
            container,
            canvas: null,
            ctx: null,
            data: [],
            options: {
                width: options.width || 400,
                height: options.height || 200,
                colors: options.colors || ['#2196F3'],
                showGrid: options.showGrid !== false,
                animate: options.animate !== false,
                padding: { top: 20, right: 20, bottom: 40, left: 50 }
            }
        };

        chart.canvas = this.createCanvas(container, chart.options.width, chart.options.height);
        chart.ctx = chart.canvas.getContext('2d');

        this.charts.set(containerId, chart);
        this.drawBarChart(chart);
    }

    createPieChart(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const chart = {
            type: 'pie',
            container,
            canvas: null,
            ctx: null,
            data: [],
            options: {
                width: options.width || 300,
                height: options.height || 300,
                colors: options.colors || ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0'],
                animate: options.animate !== false,
                showLabels: options.showLabels !== false,
                padding: 20
            }
        };

        chart.canvas = this.createCanvas(container, chart.options.width, chart.options.height);
        chart.ctx = chart.canvas.getContext('2d');

        this.charts.set(containerId, chart);
        this.drawPieChart(chart);
    }

    createTimelineChart(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const chart = {
            type: 'timeline',
            container,
            canvas: null,
            ctx: null,
            data: {},
            options: {
                width: options.width || 800,
                height: options.height || 300,
                colors: options.colors || {},
                showGrid: true,
                animate: options.animate !== false,
                padding: { top: 20, right: 20, bottom: 40, left: 60 }
            }
        };

        chart.canvas = this.createCanvas(container, chart.options.width, chart.options.height);
        chart.ctx = chart.canvas.getContext('2d');

        this.charts.set(containerId, chart);
        this.drawTimelineChart(chart);
    }

    createCanvas(container, width, height) {
        // Clear container
        container.innerHTML = '';

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);

        return canvas;
    }

    updateChart(chartId, data) {
        const chart = this.charts.get(chartId);
        if (!chart) {
            console.error(`Chart ${chartId} not found`);
            return;
        }

        chart.data = data;

        // Redraw chart based on type
        switch (chart.type) {
            case 'line':
                this.drawLineChart(chart);
                break;
            case 'area':
                this.drawAreaChart(chart);
                break;
            case 'bar':
                this.drawBarChart(chart);
                break;
            case 'pie':
                this.drawPieChart(chart);
                break;
            case 'timeline':
                this.drawTimelineChart(chart);
                break;
        }
    }

    drawLineChart(chart) {
        const { ctx, canvas, data, options } = chart;
        const { padding } = options;
        const colors = this.colors[this.theme];

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data || data.length === 0) {
            this.drawNoData(ctx, canvas);
            return;
        }

        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;

        // Calculate scales
        const xScale = this.calculateXScale(data, chartWidth);
        const yScale = this.calculateYScale(data, chartHeight);

        // Draw grid if enabled
        if (options.showGrid) {
            this.drawGrid(ctx, padding, chartWidth, chartHeight, colors);
        }

        // Draw axes
        this.drawAxes(ctx, padding, chartWidth, chartHeight, colors);

        // Draw line
        ctx.save();
        ctx.translate(padding.left, padding.top);
        ctx.strokeStyle = options.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = xScale(point.x || index);
            const y = chartHeight - yScale(point.y);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
        ctx.restore();

        // Draw points
        ctx.save();
        ctx.translate(padding.left, padding.top);
        ctx.fillStyle = options.color;

        data.forEach((point, index) => {
            const x = xScale(point.x || index);
            const y = chartHeight - yScale(point.y);

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    drawAreaChart(chart) {
        const { ctx, canvas, data, options } = chart;
        const { padding } = options;
        const colors = this.colors[this.theme];

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data || data.length === 0) {
            this.drawNoData(ctx, canvas);
            return;
        }

        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;

        // Calculate scales
        const xScale = this.calculateXScale(data, chartWidth);
        const yScale = this.calculateYScale(data, chartHeight);

        // Draw grid
        if (options.showGrid) {
            this.drawGrid(ctx, padding, chartWidth, chartHeight, colors);
        }

        // Draw axes
        this.drawAxes(ctx, padding, chartWidth, chartHeight, colors);

        // Draw area
        ctx.save();
        ctx.translate(padding.left, padding.top);

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
        gradient.addColorStop(0, options.color + '88');
        gradient.addColorStop(1, options.color + '11');

        ctx.fillStyle = gradient;
        ctx.beginPath();

        // Draw area path
        ctx.moveTo(0, chartHeight);
        data.forEach((point, index) => {
            const x = xScale(point.x || index);
            const y = chartHeight - yScale(point.y);
            ctx.lineTo(x, y);
        });
        ctx.lineTo(chartWidth, chartHeight);
        ctx.closePath();
        ctx.fill();

        // Draw line
        ctx.strokeStyle = options.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = xScale(point.x || index);
            const y = chartHeight - yScale(point.y);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
        ctx.restore();
    }

    drawBarChart(chart) {
        const { ctx, canvas, data, options } = chart;
        const { padding } = options;
        const colors = this.colors[this.theme];

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data || data.length === 0) {
            this.drawNoData(ctx, canvas);
            return;
        }

        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;
        const barWidth = chartWidth / data.length * 0.8;
        const barSpacing = chartWidth / data.length * 0.2;

        // Calculate max value
        const maxValue = Math.max(...data.map(d => d.value));

        // Draw grid
        if (options.showGrid) {
            this.drawGrid(ctx, padding, chartWidth, chartHeight, colors);
        }

        // Draw axes
        this.drawAxes(ctx, padding, chartWidth, chartHeight, colors);

        // Draw bars
        ctx.save();
        ctx.translate(padding.left, padding.top);

        data.forEach((item, index) => {
            const x = index * (barWidth + barSpacing) + barSpacing / 2;
            const height = (item.value / maxValue) * chartHeight;
            const y = chartHeight - height;

            // Draw bar
            ctx.fillStyle = options.colors[index % options.colors.length];
            ctx.fillRect(x, y, barWidth, height);

            // Draw label
            ctx.fillStyle = colors.text;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, x + barWidth / 2, chartHeight + 15);

            // Draw value
            ctx.fillText(item.value.toFixed(0), x + barWidth / 2, y - 5);
        });

        ctx.restore();
    }

    drawPieChart(chart) {
        const { ctx, canvas, data, options } = chart;
        const colors = this.colors[this.theme];

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data || data.length === 0) {
            this.drawNoData(ctx, canvas);
            return;
        }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - options.padding;

        // Calculate total
        const total = data.reduce((sum, item) => sum + item.value, 0);

        // Draw pie slices
        let currentAngle = -Math.PI / 2;

        data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * Math.PI * 2;

            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = options.colors[index % options.colors.length];
            ctx.fill();

            // Draw border
            ctx.strokeStyle = colors.background;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label if enabled
            if (options.showLabels && item.value > 0) {
                const labelAngle = currentAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
                const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

                ctx.fillStyle = colors.text;
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${item.label}`, labelX, labelY);
                ctx.font = '11px sans-serif';
                ctx.fillText(`${((item.value / total) * 100).toFixed(1)}%`, labelX, labelY + 15);
            }

            currentAngle += sliceAngle;
        });
    }

    drawTimelineChart(chart) {
        const { ctx, canvas, data, options } = chart;
        const { padding } = options;
        const colors = this.colors[this.theme];

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data || Object.keys(data).length === 0) {
            this.drawNoData(ctx, canvas);
            return;
        }

        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;

        // Draw grid
        this.drawGrid(ctx, padding, chartWidth, chartHeight, colors);

        // Draw axes
        this.drawAxes(ctx, padding, chartWidth, chartHeight, colors);

        // Find global min/max for all series
        let globalMin = Infinity;
        let globalMax = -Infinity;
        let maxPoints = 0;

        Object.values(data).forEach(series => {
            if (series.length > maxPoints) maxPoints = series.length;
            series.forEach(point => {
                if (point.y < globalMin) globalMin = point.y;
                if (point.y > globalMax) globalMax = point.y;
            });
        });

        // Draw each series
        ctx.save();
        ctx.translate(padding.left, padding.top);

        let legendY = 10;
        Object.entries(data).forEach(([key, series]) => {
            if (!series || series.length === 0) return;

            const color = options.colors[key] || '#999999';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            series.forEach((point, index) => {
                const x = (index / (maxPoints - 1)) * chartWidth;
                const y = chartHeight - ((point.y - globalMin) / (globalMax - globalMin)) * chartHeight;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // Draw legend
            ctx.fillStyle = color;
            ctx.fillRect(chartWidth - 100, legendY, 15, 3);
            ctx.fillStyle = colors.text;
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(key, chartWidth - 80, legendY + 4);
            legendY += 20;
        });

        ctx.restore();
    }

    drawGrid(ctx, padding, width, height, colors) {
        ctx.save();
        ctx.translate(padding.left, padding.top);
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;

        // Horizontal lines
        const hLines = 5;
        for (let i = 0; i <= hLines; i++) {
            const y = (height / hLines) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical lines
        const vLines = 8;
        for (let i = 0; i <= vLines; i++) {
            const x = (width / vLines) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawAxes(ctx, padding, width, height, colors) {
        ctx.save();
        ctx.strokeStyle = colors.axis;
        ctx.lineWidth = 2;

        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + height);
        ctx.stroke();

        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + height);
        ctx.lineTo(padding.left + width, padding.top + height);
        ctx.stroke();

        ctx.restore();
    }

    drawNoData(ctx, canvas) {
        const colors = this.colors[this.theme];
        ctx.fillStyle = colors.text;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
    }

    calculateXScale(data, width) {
        const minX = Math.min(...data.map((d, i) => d.x || i));
        const maxX = Math.max(...data.map((d, i) => d.x || i));
        const range = maxX - minX || 1;

        return (value) => ((value - minX) / range) * width;
    }

    calculateYScale(data, height) {
        const minY = Math.min(...data.map(d => d.y));
        const maxY = Math.max(...data.map(d => d.y));
        const range = maxY - minY || 1;

        return (value) => ((value - minY) / range) * height;
    }

    setTheme(theme) {
        this.theme = theme;
        // Redraw all charts with new theme
        this.charts.forEach((chart, id) => {
            this.updateChart(id, chart.data);
        });
    }

    destroy() {
        this.charts.clear();
    }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetricsVisualizer;
}
/**
 * ChartComponents - Reusable chart components for ML metrics
 */

class ChartComponents {
    constructor() {
        this.animationFrames = new Map();
        this.theme = 'light';
    }

    /**
     * Create a gauge chart for single value metrics
     */
    createGaugeChart(container, options = {}) {
        const defaults = {
            value: 0,
            min: 0,
            max: 100,
            label: 'Value',
            unit: '%',
            width: 200,
            height: 150,
            colors: {
                low: '#F44336',
                medium: '#FF9800',
                high: '#4CAF50'
            },
            thresholds: {
                low: 33,
                medium: 66
            }
        };

        const config = { ...defaults, ...options };
        container.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.width = config.width;
        canvas.height = config.height;
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        this.drawGauge(ctx, config);

        return {
            update: (value) => {
                config.value = value;
                this.animateGauge(ctx, config);
            }
        };
    }

    drawGauge(ctx, config) {
        const { width, height, value, min, max, label, unit } = config;
        const centerX = width / 2;
        const centerY = height - 20;
        const radius = Math.min(centerX, centerY) - 20;
        const startAngle = Math.PI;
        const endAngle = 2 * Math.PI;
        const range = max - min;
        const normalizedValue = (value - min) / range;
        const valueAngle = startAngle + (endAngle - startAngle) * normalizedValue;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 20;
        ctx.stroke();

        // Determine color based on value
        let color = config.colors.low;
        if (value > config.thresholds.medium) {
            color = config.colors.high;
        } else if (value > config.thresholds.low) {
            color = config.colors.medium;
        }

        // Draw value arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, valueAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw value text
        ctx.fillStyle = this.theme === 'dark' ? '#ffffff' : '#333333';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${value.toFixed(1)}${unit}`, centerX, centerY - 10);

        // Draw label
        ctx.font = '14px sans-serif';
        ctx.fillText(label, centerX, centerY + 15);
    }

    animateGauge(ctx, config) {
        const animationId = `gauge_${ctx.canvas.id}`;
        const currentFrame = this.animationFrames.get(animationId);
        
        if (currentFrame) {
            cancelAnimationFrame(currentFrame);
        }

        const startValue = config.currentValue || 0;
        const endValue = config.value;
        const duration = 500; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentValue = startValue + (endValue - startValue) * this.easeInOutQuad(progress);
            
            config.currentValue = currentValue;
            this.drawGauge(ctx, { ...config, value: currentValue });

            if (progress < 1) {
                const frame = requestAnimationFrame(animate);
                this.animationFrames.set(animationId, frame);
            } else {
                config.currentValue = endValue;
            }
        };

        animate();
    }

    /**
     * Create a sparkline chart for trends
     */
    createSparklineChart(container, options = {}) {
        const defaults = {
            data: [],
            width: 150,
            height: 40,
            color: '#2196F3',
            showDots: false,
            fill: false
        };

        const config = { ...defaults, ...options };
        container.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.width = config.width;
        canvas.height = config.height;
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        this.drawSparkline(ctx, config);

        return {
            update: (data) => {
                config.data = data;
                this.drawSparkline(ctx, config);
            }
        };
    }

    drawSparkline(ctx, config) {
        const { width, height, data, color, showDots, fill } = config;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!data || data.length < 2) return;

        const padding = 2;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // Calculate scales
        const minY = Math.min(...data);
        const maxY = Math.max(...data);
        const rangeY = maxY - minY || 1;
        const stepX = chartWidth / (data.length - 1);

        ctx.save();
        ctx.translate(padding, padding);

        // Draw fill if enabled
        if (fill) {
            const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
            gradient.addColorStop(0, color + '40');
            gradient.addColorStop(1, color + '10');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, chartHeight);
            
            data.forEach((value, index) => {
                const x = index * stepX;
                const y = chartHeight - ((value - minY) / rangeY) * chartHeight;
                ctx.lineTo(x, y);
            });
            
            ctx.lineTo(chartWidth, chartHeight);
            ctx.closePath();
            ctx.fill();
        }

        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((value, index) => {
            const x = index * stepX;
            const y = chartHeight - ((value - minY) / rangeY) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw dots if enabled
        if (showDots) {
            ctx.fillStyle = color;
            data.forEach((value, index) => {
                const x = index * stepX;
                const y = chartHeight - ((value - minY) / rangeY) * chartHeight;
                
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        ctx.restore();
    }

    /**
     * Create a heatmap for matrix data
     */
    createHeatmapChart(container, options = {}) {
        const defaults = {
            data: [],
            width: 400,
            height: 300,
            colorScale: {
                low: '#4CAF50',
                medium: '#FFEB3B',
                high: '#F44336'
            },
            showLabels: true,
            cellSize: 30
        };

        const config = { ...defaults, ...options };
        container.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.width = config.width;
        canvas.height = config.height;
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        this.drawHeatmap(ctx, config);

        return {
            update: (data) => {
                config.data = data;
                this.drawHeatmap(ctx, config);
            }
        };
    }

    drawHeatmap(ctx, config) {
        const { width, height, data, colorScale, showLabels, cellSize } = config;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!data || data.length === 0) return;

        const rows = data.length;
        const cols = data[0].length;
        const padding = showLabels ? 50 : 10;
        const availableWidth = width - padding * 2;
        const availableHeight = height - padding * 2;
        const actualCellWidth = Math.min(cellSize, availableWidth / cols);
        const actualCellHeight = Math.min(cellSize, availableHeight / rows);

        // Find min/max values
        let minValue = Infinity;
        let maxValue = -Infinity;
        data.forEach(row => {
            row.forEach(value => {
                if (value < minValue) minValue = value;
                if (value > maxValue) maxValue = value;
            });
        });

        const range = maxValue - minValue || 1;

        ctx.save();
        ctx.translate(padding, padding);

        // Draw cells
        data.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                const x = colIndex * actualCellWidth;
                const y = rowIndex * actualCellHeight;
                const normalizedValue = (value - minValue) / range;
                
                // Get color based on value
                const color = this.interpolateColor(
                    normalizedValue,
                    colorScale.low,
                    colorScale.medium,
                    colorScale.high
                );
                
                ctx.fillStyle = color;
                ctx.fillRect(x, y, actualCellWidth - 1, actualCellHeight - 1);
                
                // Draw value if cells are large enough
                if (actualCellWidth > 25 && actualCellHeight > 20) {
                    ctx.fillStyle = this.getContrastColor(color);
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        value.toFixed(1),
                        x + actualCellWidth / 2,
                        y + actualCellHeight / 2
                    );
                }
            });
        });

        ctx.restore();
    }

    /**
     * Create a progress ring chart
     */
    createProgressRing(container, options = {}) {
        const defaults = {
            value: 0,
            max: 100,
            size: 100,
            strokeWidth: 10,
            color: '#2196F3',
            backgroundColor: '#e0e0e0',
            showValue: true,
            label: ''
        };

        const config = { ...defaults, ...options };
        container.innerHTML = '';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.size);
        svg.setAttribute('height', config.size);
        container.appendChild(svg);

        this.drawProgressRing(svg, config);

        return {
            update: (value) => {
                config.value = value;
                this.animateProgressRing(svg, config);
            }
        };
    }

    drawProgressRing(svg, config) {
        const { size, strokeWidth, value, max, color, backgroundColor, showValue, label } = config;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const progress = value / max;
        const dashOffset = circumference * (1 - progress);

        svg.innerHTML = `
            <circle
                cx="${size / 2}"
                cy="${size / 2}"
                r="${radius}"
                stroke="${backgroundColor}"
                stroke-width="${strokeWidth}"
                fill="none"
            />
            <circle
                cx="${size / 2}"
                cy="${size / 2}"
                r="${radius}"
                stroke="${color}"
                stroke-width="${strokeWidth}"
                fill="none"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}"
                transform="rotate(-90 ${size / 2} ${size / 2})"
                style="transition: stroke-dashoffset 0.5s ease-in-out;"
            />
            ${showValue ? `
                <text
                    x="${size / 2}"
                    y="${size / 2}"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-size="${size / 5}px"
                    font-weight="bold"
                    fill="${this.theme === 'dark' ? '#ffffff' : '#333333'}"
                >
                    ${Math.round(progress * 100)}%
                </text>
            ` : ''}
            ${label ? `
                <text
                    x="${size / 2}"
                    y="${size / 2 + size / 4}"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-size="${size / 8}px"
                    fill="${this.theme === 'dark' ? '#ffffff' : '#666666'}"
                >
                    ${label}
                </text>
            ` : ''}
        `;
    }

    animateProgressRing(svg, config) {
        // Animation is handled by CSS transition
        this.drawProgressRing(svg, config);
    }

    /**
     * Utility functions
     */
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    interpolateColor(value, color1, color2, color3) {
        if (value < 0.5) {
            return this.blendColors(color1, color2, value * 2);
        } else {
            return this.blendColors(color2, color3, (value - 0.5) * 2);
        }
    }

    blendColors(color1, color2, ratio) {
        const hex = (x) => {
            x = x.toString(16);
            return x.length === 1 ? '0' + x : x;
        };

        const r1 = parseInt(color1.substr(1, 2), 16);
        const g1 = parseInt(color1.substr(3, 2), 16);
        const b1 = parseInt(color1.substr(5, 2), 16);

        const r2 = parseInt(color2.substr(1, 2), 16);
        const g2 = parseInt(color2.substr(3, 2), 16);
        const b2 = parseInt(color2.substr(5, 2), 16);

        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

        return '#' + hex(r) + hex(g) + hex(b);
    }

    getContrastColor(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    setTheme(theme) {
        this.theme = theme;
    }

    destroy() {
        // Cancel all animations
        this.animationFrames.forEach(frame => {
            cancelAnimationFrame(frame);
        });
        this.animationFrames.clear();
    }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartComponents;
}
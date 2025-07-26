/**
 * ConfidenceVisualizer.js - Confidence Visualization Widgets
 * 
 * Provides various visualization components for confidence metrics including
 * meters, charts, and dashboards. Uses Canvas/SVG for smooth animations.
 */

(function(window) {
    'use strict';

    class ConfidenceVisualizer {
        constructor() {
            this.visualizations = new Map();
            this.animationFrames = new Map();
        }

        /**
         * Create a confidence meter visualization
         */
        createConfidenceMeter(container, options = {}) {
            const config = {
                size: 200,
                strokeWidth: 12,
                animated: true,
                showPercentage: true,
                showLabel: true,
                colors: {
                    low: '#ef4444',
                    medium: '#f59e0b',
                    high: '#10b981',
                    track: '#e5e7eb'
                },
                ...options
            };

            const meter = new ConfidenceMeter(container, config);
            this.visualizations.set(container, meter);
            return meter;
        }

        /**
         * Create a confidence dashboard
         */
        createDashboard(container, options = {}) {
            const dashboard = new ConfidenceDashboard(container, options);
            this.visualizations.set(container, dashboard);
            return dashboard;
        }

        /**
         * Create a convergence chart
         */
        createConvergenceChart(container, options = {}) {
            const chart = new ConvergenceChart(container, options);
            this.visualizations.set(container, chart);
            return chart;
        }

        /**
         * Create a dimension radar chart
         */
        createDimensionRadar(container, options = {}) {
            const radar = new DimensionRadar(container, options);
            this.visualizations.set(container, radar);
            return radar;
        }

        /**
         * Destroy visualization
         */
        destroy(container) {
            const viz = this.visualizations.get(container);
            if (viz) {
                viz.destroy();
                this.visualizations.delete(container);
            }
        }
    }

    /**
     * Confidence Meter Component
     */
    class ConfidenceMeter {
        constructor(container, config) {
            this.container = typeof container === 'string' ? 
                document.querySelector(container) : container;
            this.config = config;
            this.currentValue = 0;
            this.targetValue = 0;
            this.animationId = null;
            
            this.init();
        }

        init() {
            const { size, strokeWidth } = this.config;
            const center = size / 2;
            const radius = (size - strokeWidth) / 2;
            
            this.container.innerHTML = `
                <div class="confidence-meter" style="width: ${size}px; height: ${size}px;">
                    <svg width="${size}" height="${size}" class="meter-svg">
                        <!-- Background track -->
                        <circle cx="${center}" cy="${center}" r="${radius}"
                                fill="none"
                                stroke="${this.config.colors.track}"
                                stroke-width="${strokeWidth}"
                                class="meter-track" />
                        
                        <!-- Progress arc -->
                        <circle cx="${center}" cy="${center}" r="${radius}"
                                fill="none"
                                stroke="${this.config.colors.high}"
                                stroke-width="${strokeWidth}"
                                stroke-linecap="round"
                                transform="rotate(-90 ${center} ${center})"
                                class="meter-progress"
                                style="stroke-dasharray: ${2 * Math.PI * radius}; stroke-dashoffset: ${2 * Math.PI * radius};" />
                    </svg>
                    
                    ${this.config.showPercentage ? `
                        <div class="meter-value">
                            <span class="meter-number">0</span>
                            <span class="meter-percent">%</span>
                        </div>
                    ` : ''}
                    
                    ${this.config.showLabel ? `
                        <div class="meter-label">Confiança</div>
                    ` : ''}
                </div>
            `;
            
            this.progressCircle = this.container.querySelector('.meter-progress');
            this.numberElement = this.container.querySelector('.meter-number');
        }

        setValue(value, animate = true) {
            this.targetValue = Math.max(0, Math.min(1, value));
            
            if (animate && this.config.animated) {
                this.animateToValue();
            } else {
                this.currentValue = this.targetValue;
                this.updateDisplay();
            }
        }

        animateToValue() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            
            const startValue = this.currentValue;
            const endValue = this.targetValue;
            const duration = 800;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeOutCubic(progress);
                
                this.currentValue = startValue + (endValue - startValue) * eased;
                this.updateDisplay();
                
                if (progress < 1) {
                    this.animationId = requestAnimationFrame(animate);
                }
            };
            
            animate();
        }

        updateDisplay() {
            const { size, strokeWidth, colors } = this.config;
            const radius = (size - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference * (1 - this.currentValue);
            
            // Update progress circle
            if (this.progressCircle) {
                this.progressCircle.style.strokeDashoffset = offset;
                
                // Update color based on value
                let color = colors.low;
                if (this.currentValue >= 0.8) color = colors.high;
                else if (this.currentValue >= 0.5) color = colors.medium;
                
                this.progressCircle.style.stroke = color;
            }
            
            // Update number
            if (this.numberElement) {
                this.numberElement.textContent = Math.round(this.currentValue * 100);
            }
        }

        easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        destroy() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.container.innerHTML = '';
        }
    }

    /**
     * Confidence Dashboard Component
     */
    class ConfidenceDashboard {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? 
                document.querySelector(container) : container;
            this.options = {
                showOverallScore: true,
                showDimensions: true,
                showTrend: true,
                showPrediction: true,
                animated: true,
                ...options
            };
            
            this.meters = new Map();
            this.init();
        }

        init() {
            this.container.innerHTML = `
                <div class="confidence-dashboard">
                    ${this.options.showOverallScore ? `
                        <div class="dashboard-section overall-section">
                            <h3 class="section-title">Confiança Geral</h3>
                            <div class="overall-meter-container"></div>
                            <div class="overall-details">
                                <div class="trend-indicator">
                                    <svg class="trend-icon" width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                                    </svg>
                                    <span class="trend-text">--</span>
                                </div>
                                <div class="prediction-text">--</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${this.options.showDimensions ? `
                        <div class="dashboard-section dimensions-section">
                            <h3 class="section-title">Análise por Dimensão</h3>
                            <div class="dimensions-grid">
                                <div class="dimension-item" data-dimension="semantic">
                                    <div class="dimension-header">
                                        <span class="dimension-name">Semântico</span>
                                        <span class="dimension-value">0%</span>
                                    </div>
                                    <div class="dimension-bar">
                                        <div class="dimension-fill" style="width: 0%"></div>
                                    </div>
                                </div>
                                <div class="dimension-item" data-dimension="categorical">
                                    <div class="dimension-header">
                                        <span class="dimension-name">Categórico</span>
                                        <span class="dimension-value">0%</span>
                                    </div>
                                    <div class="dimension-bar">
                                        <div class="dimension-fill" style="width: 0%"></div>
                                    </div>
                                </div>
                                <div class="dimension-item" data-dimension="structural">
                                    <div class="dimension-header">
                                        <span class="dimension-name">Estrutural</span>
                                        <span class="dimension-value">0%</span>
                                    </div>
                                    <div class="dimension-bar">
                                        <div class="dimension-fill" style="width: 0%"></div>
                                    </div>
                                </div>
                                <div class="dimension-item" data-dimension="temporal">
                                    <div class="dimension-header">
                                        <span class="dimension-name">Temporal</span>
                                        <span class="dimension-value">0%</span>
                                    </div>
                                    <div class="dimension-bar">
                                        <div class="dimension-fill" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${this.options.showTrend ? `
                        <div class="dashboard-section trend-section">
                            <h3 class="section-title">Tendência de Convergência</h3>
                            <div class="mini-chart-container">
                                <canvas class="trend-chart" width="300" height="100"></canvas>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Initialize overall meter
            if (this.options.showOverallScore) {
                const meterContainer = this.container.querySelector('.overall-meter-container');
                this.overallMeter = new ConfidenceMeter(meterContainer, {
                    size: 180,
                    strokeWidth: 10,
                    showLabel: false
                });
            }
            
            // Initialize trend chart
            if (this.options.showTrend) {
                this.trendCanvas = this.container.querySelector('.trend-chart');
                this.trendCtx = this.trendCanvas.getContext('2d');
                this.trendData = [];
            }
        }

        updateMetrics(metrics) {
            // Update overall score
            if (this.overallMeter) {
                this.overallMeter.setValue(metrics.overall);
            }
            
            // Update dimensions
            if (this.options.showDimensions && metrics.dimensions) {
                Object.entries(metrics.dimensions).forEach(([key, value]) => {
                    this.updateDimension(key, value);
                });
            }
            
            // Update trend
            if (this.options.showTrend) {
                this.updateTrend(metrics);
            }
            
            // Update prediction
            if (metrics.convergencePrediction) {
                this.updatePrediction(metrics.convergencePrediction);
            }
        }

        updateDimension(dimension, value) {
            const item = this.container.querySelector(`[data-dimension="${dimension}"]`);
            if (!item) return;
            
            const valueEl = item.querySelector('.dimension-value');
            const fillEl = item.querySelector('.dimension-fill');
            
            const percent = Math.round(value * 100);
            valueEl.textContent = `${percent}%`;
            
            if (this.options.animated) {
                fillEl.style.transition = 'width 0.5s ease-out';
            }
            fillEl.style.width = `${percent}%`;
            
            // Update color based on value
            let className = 'low';
            if (value >= 0.8) className = 'high';
            else if (value >= 0.5) className = 'medium';
            
            item.className = `dimension-item ${className}`;
        }

        updateTrend(metrics) {
            this.trendData.push({
                value: metrics.overall,
                timestamp: Date.now()
            });
            
            // Keep last 20 points
            if (this.trendData.length > 20) {
                this.trendData.shift();
            }
            
            this.drawTrendChart();
            
            // Update trend indicator
            const trendText = this.container.querySelector('.trend-text');
            const trendIcon = this.container.querySelector('.trend-icon');
            
            if (this.trendData.length >= 2) {
                const lastValue = this.trendData[this.trendData.length - 1].value;
                const prevValue = this.trendData[this.trendData.length - 2].value;
                const diff = lastValue - prevValue;
                const percent = Math.round(diff * 100);
                
                if (diff > 0) {
                    trendText.textContent = `+${percent}%`;
                    trendIcon.innerHTML = `<path d="M8 12V4m0 0L4 8m4-4l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
                    trendText.parentElement.className = 'trend-indicator positive';
                } else if (diff < 0) {
                    trendText.textContent = `${percent}%`;
                    trendIcon.innerHTML = `<path d="M8 4v8m0 0l4-4m-4 4L4 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
                    trendText.parentElement.className = 'trend-indicator negative';
                } else {
                    trendText.textContent = '0%';
                    trendIcon.innerHTML = `<path d="M4 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
                    trendText.parentElement.className = 'trend-indicator neutral';
                }
            }
        }

        drawTrendChart() {
            const ctx = this.trendCtx;
            const canvas = this.trendCanvas;
            const width = canvas.width;
            const height = canvas.height;
            const padding = 10;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            if (this.trendData.length < 2) return;
            
            // Calculate points
            const points = this.trendData.map((d, i) => ({
                x: padding + (i / (this.trendData.length - 1)) * (width - 2 * padding),
                y: height - padding - (d.value * (height - 2 * padding))
            }));
            
            // Draw gradient fill
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
            
            ctx.beginPath();
            ctx.moveTo(points[0].x, height - padding);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(points[points.length - 1].x, height - padding);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw line
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw points
            points.forEach((p, i) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
        }

        updatePrediction(prediction) {
            const predictionEl = this.container.querySelector('.prediction-text');
            if (!predictionEl) return;
            
            if (prediction.willConverge) {
                if (prediction.isConverged) {
                    predictionEl.textContent = 'Convergido ✓';
                    predictionEl.className = 'prediction-text converged';
                } else {
                    predictionEl.textContent = `Convergência em ${prediction.estimatedIterations} iterações`;
                    predictionEl.className = 'prediction-text converging';
                }
            } else {
                predictionEl.textContent = 'Não convergindo';
                predictionEl.className = 'prediction-text not-converging';
            }
        }

        destroy() {
            if (this.overallMeter) {
                this.overallMeter.destroy();
            }
            this.meters.clear();
            this.container.innerHTML = '';
        }
    }

    /**
     * Convergence Chart Component
     */
    class ConvergenceChart {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? 
                document.querySelector(container) : container;
            this.options = {
                width: 600,
                height: 300,
                padding: 40,
                showGrid: true,
                showTarget: true,
                targetValue: 0.85,
                colors: {
                    actual: '#3b82f6',
                    predicted: '#10b981',
                    target: '#ef4444',
                    grid: '#e5e7eb',
                    text: '#6b7280'
                },
                ...options
            };
            
            this.data = [];
            this.predictions = [];
            this.init();
        }

        init() {
            this.container.innerHTML = `
                <div class="convergence-chart">
                    <canvas width="${this.options.width}" height="${this.options.height}"></canvas>
                    <div class="chart-legend">
                        <div class="legend-item">
                            <span class="legend-color" style="background: ${this.options.colors.actual}"></span>
                            <span class="legend-label">Confiança Atual</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: ${this.options.colors.predicted}"></span>
                            <span class="legend-label">Previsão</span>
                        </div>
                        ${this.options.showTarget ? `
                            <div class="legend-item">
                                <span class="legend-color" style="background: ${this.options.colors.target}"></span>
                                <span class="legend-label">Meta (${Math.round(this.options.targetValue * 100)}%)</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            this.canvas = this.container.querySelector('canvas');
            this.ctx = this.canvas.getContext('2d');
            
            // Set device pixel ratio for sharp rendering
            const dpr = window.devicePixelRatio || 1;
            this.canvas.style.width = this.options.width + 'px';
            this.canvas.style.height = this.options.height + 'px';
            this.canvas.width = this.options.width * dpr;
            this.canvas.height = this.options.height * dpr;
            this.ctx.scale(dpr, dpr);
        }

        addDataPoint(iteration, confidence, prediction = null) {
            this.data.push({ iteration, confidence });
            if (prediction !== null) {
                this.predictions.push({ iteration, confidence: prediction });
            }
            
            // Keep last 50 points
            if (this.data.length > 50) {
                this.data.shift();
            }
            if (this.predictions.length > 50) {
                this.predictions.shift();
            }
            
            this.render();
        }

        setData(data, predictions = []) {
            this.data = data;
            this.predictions = predictions;
            this.render();
        }

        render() {
            const { width, height, padding, colors } = this.options;
            const ctx = this.ctx;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            if (this.data.length === 0) return;
            
            // Calculate bounds
            const xMin = Math.min(...this.data.map(d => d.iteration));
            const xMax = Math.max(...this.data.map(d => d.iteration));
            const yMin = 0;
            const yMax = 1;
            
            const xScale = (width - 2 * padding) / (xMax - xMin || 1);
            const yScale = (height - 2 * padding) / (yMax - yMin);
            
            // Draw grid
            if (this.options.showGrid) {
                this.drawGrid(xMin, xMax, yMin, yMax, xScale, yScale);
            }
            
            // Draw target line
            if (this.options.showTarget) {
                this.drawTargetLine(yScale);
            }
            
            // Draw prediction line
            if (this.predictions.length > 0) {
                this.drawLine(this.predictions, xMin, xScale, yScale, colors.predicted, 2, [5, 5]);
            }
            
            // Draw actual line
            this.drawLine(this.data, xMin, xScale, yScale, colors.actual, 2);
            
            // Draw data points
            this.drawPoints(this.data, xMin, xScale, yScale, colors.actual);
            
            // Draw axes
            this.drawAxes();
            
            // Draw labels
            this.drawLabels(xMin, xMax, yMin, yMax);
        }

        drawGrid(xMin, xMax, yMin, yMax, xScale, yScale) {
            const { padding, colors, width, height } = this.options;
            const ctx = this.ctx;
            
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            
            // Vertical lines
            const xStep = Math.ceil((xMax - xMin) / 10);
            for (let x = xMin; x <= xMax; x += xStep) {
                const px = padding + (x - xMin) * xScale;
                ctx.beginPath();
                ctx.moveTo(px, padding);
                ctx.lineTo(px, height - padding);
                ctx.stroke();
            }
            
            // Horizontal lines
            for (let y = 0; y <= 1; y += 0.2) {
                const py = height - padding - y * yScale;
                ctx.beginPath();
                ctx.moveTo(padding, py);
                ctx.lineTo(width - padding, py);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
        }

        drawTargetLine(yScale) {
            const { padding, colors, width, height, targetValue } = this.options;
            const ctx = this.ctx;
            
            const y = height - padding - targetValue * yScale;
            
            ctx.strokeStyle = colors.target;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            
            ctx.setLineDash([]);
        }

        drawLine(data, xMin, xScale, yScale, color, lineWidth, dash = []) {
            const { padding, height } = this.options;
            const ctx = this.ctx;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash(dash);
            
            ctx.beginPath();
            data.forEach((d, i) => {
                const x = padding + (d.iteration - xMin) * xScale;
                const y = height - padding - d.confidence * yScale;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
            
            ctx.setLineDash([]);
        }

        drawPoints(data, xMin, xScale, yScale, color) {
            const { padding, height } = this.options;
            const ctx = this.ctx;
            
            data.forEach(d => {
                const x = padding + (d.iteration - xMin) * xScale;
                const y = height - padding - d.confidence * yScale;
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        drawAxes() {
            const { padding, colors, width, height } = this.options;
            const ctx = this.ctx;
            
            ctx.strokeStyle = colors.text;
            ctx.lineWidth = 2;
            
            // X axis
            ctx.beginPath();
            ctx.moveTo(padding, height - padding);
            ctx.lineTo(width - padding, height - padding);
            ctx.stroke();
            
            // Y axis
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, height - padding);
            ctx.stroke();
        }

        drawLabels(xMin, xMax, yMin, yMax) {
            const { padding, colors, width, height } = this.options;
            const ctx = this.ctx;
            
            ctx.fillStyle = colors.text;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            // X axis labels
            const xStep = Math.ceil((xMax - xMin) / 5);
            for (let x = xMin; x <= xMax; x += xStep) {
                const px = padding + (x - xMin) * ((width - 2 * padding) / (xMax - xMin));
                ctx.fillText(x.toString(), px, height - padding + 5);
            }
            
            // Y axis labels
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let y = 0; y <= 1; y += 0.2) {
                const py = height - padding - y * (height - 2 * padding);
                ctx.fillText((y * 100).toFixed(0) + '%', padding - 5, py);
            }
            
            // Axis titles
            ctx.save();
            ctx.translate(padding / 2, height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText('Confiança', 0, 0);
            ctx.restore();
            
            ctx.textAlign = 'center';
            ctx.fillText('Iterações', width / 2, height - 5);
        }

        destroy() {
            this.container.innerHTML = '';
        }
    }

    /**
     * Dimension Radar Chart Component
     */
    class DimensionRadar {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? 
                document.querySelector(container) : container;
            this.options = {
                size: 300,
                padding: 40,
                levels: 5,
                animated: true,
                colors: {
                    fill: 'rgba(59, 130, 246, 0.3)',
                    stroke: '#3b82f6',
                    grid: '#e5e7eb',
                    text: '#6b7280'
                },
                dimensions: [
                    { key: 'semantic', label: 'Semântico' },
                    { key: 'categorical', label: 'Categórico' },
                    { key: 'structural', label: 'Estrutural' },
                    { key: 'temporal', label: 'Temporal' }
                ],
                ...options
            };
            
            this.currentValues = {};
            this.targetValues = {};
            this.animationId = null;
            
            this.init();
        }

        init() {
            const { size } = this.options;
            
            this.container.innerHTML = `
                <div class="dimension-radar" style="width: ${size}px; height: ${size}px;">
                    <canvas width="${size}" height="${size}"></canvas>
                </div>
            `;
            
            this.canvas = this.container.querySelector('canvas');
            this.ctx = this.canvas.getContext('2d');
            
            // Set device pixel ratio
            const dpr = window.devicePixelRatio || 1;
            this.canvas.style.width = size + 'px';
            this.canvas.style.height = size + 'px';
            this.canvas.width = size * dpr;
            this.canvas.height = size * dpr;
            this.ctx.scale(dpr, dpr);
            
            // Initialize values
            this.options.dimensions.forEach(dim => {
                this.currentValues[dim.key] = 0;
                this.targetValues[dim.key] = 0;
            });
            
            this.render();
        }

        setValues(values, animate = true) {
            Object.entries(values).forEach(([key, value]) => {
                this.targetValues[key] = Math.max(0, Math.min(1, value));
            });
            
            if (animate && this.options.animated) {
                this.animateToValues();
            } else {
                this.currentValues = { ...this.targetValues };
                this.render();
            }
        }

        animateToValues() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            
            const startValues = { ...this.currentValues };
            const duration = 800;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeOutCubic(progress);
                
                Object.keys(this.targetValues).forEach(key => {
                    this.currentValues[key] = startValues[key] + 
                        (this.targetValues[key] - startValues[key]) * eased;
                });
                
                this.render();
                
                if (progress < 1) {
                    this.animationId = requestAnimationFrame(animate);
                }
            };
            
            animate();
        }

        render() {
            const { size, padding, levels, colors, dimensions } = this.options;
            const ctx = this.ctx;
            const center = size / 2;
            const radius = (size - 2 * padding) / 2;
            
            // Clear canvas
            ctx.clearRect(0, 0, size, size);
            
            // Draw grid
            this.drawGrid(center, radius, levels);
            
            // Draw axes
            this.drawAxes(center, radius, dimensions);
            
            // Draw data
            this.drawData(center, radius, dimensions);
            
            // Draw labels
            this.drawLabels(center, radius, dimensions);
        }

        drawGrid(center, radius, levels) {
            const ctx = this.ctx;
            const { colors, dimensions } = this.options;
            
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            
            // Draw concentric polygons
            for (let level = 1; level <= levels; level++) {
                const levelRadius = (radius * level) / levels;
                
                ctx.beginPath();
                dimensions.forEach((dim, i) => {
                    const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
                    const x = center + levelRadius * Math.cos(angle);
                    const y = center + levelRadius * Math.sin(angle);
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.closePath();
                ctx.stroke();
            }
        }

        drawAxes(center, radius, dimensions) {
            const ctx = this.ctx;
            const { colors } = this.options;
            
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            
            dimensions.forEach((dim, i) => {
                const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                
                ctx.beginPath();
                ctx.moveTo(center, center);
                ctx.lineTo(x, y);
                ctx.stroke();
            });
        }

        drawData(center, radius, dimensions) {
            const ctx = this.ctx;
            const { colors } = this.options;
            
            // Draw filled area
            ctx.beginPath();
            dimensions.forEach((dim, i) => {
                const value = this.currentValues[dim.key] || 0;
                const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
                const x = center + radius * value * Math.cos(angle);
                const y = center + radius * value * Math.sin(angle);
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.closePath();
            ctx.fillStyle = colors.fill;
            ctx.fill();
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw points
            dimensions.forEach((dim, i) => {
                const value = this.currentValues[dim.key] || 0;
                const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
                const x = center + radius * value * Math.cos(angle);
                const y = center + radius * value * Math.sin(angle);
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fillStyle = colors.stroke;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        drawLabels(center, radius, dimensions) {
            const ctx = this.ctx;
            const { colors } = this.options;
            
            ctx.fillStyle = colors.text;
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            dimensions.forEach((dim, i) => {
                const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
                const labelRadius = radius + 25;
                const x = center + labelRadius * Math.cos(angle);
                const y = center + labelRadius * Math.sin(angle);
                
                // Draw label
                ctx.fillText(dim.label, x, y);
                
                // Draw value
                const value = Math.round((this.currentValues[dim.key] || 0) * 100);
                ctx.font = '12px sans-serif';
                ctx.fillText(`${value}%`, x, y + 15);
                ctx.font = '14px sans-serif';
            });
        }

        easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        destroy() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.container.innerHTML = '';
        }
    }

    // Export to global namespace
    window.ConfidenceVisualizer = ConfidenceVisualizer;
    window.ConfidenceMeter = ConfidenceMeter;
    window.ConfidenceDashboard = ConfidenceDashboard;
    window.ConvergenceChart = ConvergenceChart;
    window.DimensionRadar = DimensionRadar;

    // Auto-register with KC if available
    if (window.KC) {
        window.KC.ConfidenceVisualizer = ConfidenceVisualizer;
    }

})(window);
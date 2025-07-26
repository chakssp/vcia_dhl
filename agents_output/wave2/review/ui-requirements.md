# UI Requirements - CurationPanel Implementation

**Document Date:** January 27, 2025  
**Author:** Code Review Coordinator  
**Purpose:** Define UI requirements for Wave 2 CurationPanel implementation

## Executive Summary

The CurationPanel UI must integrate all three Wave 1 components into a cohesive, intuitive interface that enables users to track confidence evolution, manage versions, and visualize convergence patterns. The UI should follow the existing KC design system while introducing new ML-specific visualizations.

## UI Architecture Overview

### Component Hierarchy
```
CurationPanel
├── Header Section
│   ├── Title & Description
│   ├── Global Actions (Batch Analysis, Export)
│   └── View Mode Selector (Grid/List/Timeline)
│
├── Control Bar
│   ├── Filter Controls
│   ├── Sort Options
│   └── Confidence Threshold Slider
│
├── Main Content Area
│   ├── File List/Grid View
│   │   ├── FileCard Component
│   │   │   ├── Confidence Meter
│   │   │   ├── Version Indicator
│   │   │   └── Action Buttons
│   │   └── Pagination/Virtual Scroll
│   │
│   ├── Detail View (Selected File)
│   │   ├── Confidence Dashboard
│   │   ├── Version Timeline
│   │   ├── Convergence Chart
│   │   └── Analysis History
│   │
│   └── Batch Operations Panel
│       ├── Selection Summary
│       ├── Bulk Actions
│       └── Progress Indicators
│
└── Side Panels (Collapsible)
    ├── ML Configuration Panel
    │   ├── Algorithm Selector
    │   ├── Weight Adjustments
    │   └── Threshold Settings
    │
    └── Version Control Panel
        ├── Snapshot Manager
        ├── Version Comparison
        └── Restore Controls
```

## Core UI Components

### 1. FileCard Component

**Purpose:** Display individual file with confidence metrics and actions

**Visual Design Requirements:**
```html
<div class="file-card" data-confidence-level="high">
    <div class="card-header">
        <h3 class="file-name">knowledge-base-001.md</h3>
        <div class="confidence-badge">
            <svg class="confidence-ring" viewBox="0 0 100 100">
                <!-- Animated confidence ring -->
                <circle cx="50" cy="50" r="45" class="confidence-track"/>
                <circle cx="50" cy="50" r="45" class="confidence-fill" 
                        stroke-dasharray="283" 
                        stroke-dashoffset="42"/>
            </svg>
            <span class="confidence-value">85%</span>
        </div>
    </div>
    
    <div class="card-metrics">
        <div class="metric-grid">
            <div class="metric">
                <span class="label">Semântico</span>
                <div class="mini-bar" style="--value: 0.92"></div>
            </div>
            <div class="metric">
                <span class="label">Categórico</span>
                <div class="mini-bar" style="--value: 0.78"></div>
            </div>
            <div class="metric">
                <span class="label">Estrutural</span>
                <div class="mini-bar" style="--value: 0.85"></div>
            </div>
            <div class="metric">
                <span class="label">Temporal</span>
                <div class="mini-bar" style="--value: 0.88"></div>
            </div>
        </div>
    </div>
    
    <div class="card-status">
        <span class="version-info">v3 • 2 horas atrás</span>
        <span class="convergence-status converging">
            <svg class="icon" />
            Convergindo (2 iterações)
        </span>
    </div>
    
    <div class="card-actions">
        <button class="btn-icon" title="Analisar">
            <svg class="icon-analyze" />
        </button>
        <button class="btn-icon" title="Versões">
            <svg class="icon-versions" />
        </button>
        <button class="btn-icon" title="Detalhes">
            <svg class="icon-details" />
        </button>
    </div>
</div>
```

**CSS Requirements:**
```css
.file-card {
    --confidence-color: var(--color-confidence-medium);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s ease;
}

.file-card[data-confidence-level="low"] {
    --confidence-color: var(--color-confidence-low);
}

.file-card[data-confidence-level="high"] {
    --confidence-color: var(--color-confidence-high);
}

.confidence-ring {
    width: 60px;
    height: 60px;
    transform: rotate(-90deg);
}

.confidence-fill {
    stroke: var(--confidence-color);
    stroke-width: 4;
    fill: none;
    transition: stroke-dashoffset 0.5s ease;
}

.mini-bar {
    height: 4px;
    background: var(--color-background-secondary);
    border-radius: 2px;
    overflow: hidden;
}

.mini-bar::after {
    content: '';
    display: block;
    height: 100%;
    width: calc(var(--value) * 100%);
    background: var(--confidence-color);
    transition: width 0.3s ease;
}
```

### 2. Confidence Dashboard

**Purpose:** Detailed view of confidence metrics and evolution

**Component Structure:**
```javascript
class ConfidenceDashboard {
    constructor(containerId) {
        this.container = document.querySelector(containerId);
        this.charts = {};
        this.initialize();
    }
    
    initialize() {
        this.render();
        this.initializeCharts();
        this.bindEvents();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="confidence-dashboard">
                <!-- Overall Confidence Score -->
                <div class="overall-score-section">
                    <div class="score-display">
                        <div class="score-ring">
                            <svg viewBox="0 0 200 200">
                                <circle cx="100" cy="100" r="90" class="track"/>
                                <circle cx="100" cy="100" r="90" class="fill"
                                        stroke-dasharray="565"
                                        stroke-dashoffset="85"/>
                            </svg>
                            <div class="score-value">
                                <span class="number">85</span>
                                <span class="percent">%</span>
                            </div>
                        </div>
                        <div class="score-details">
                            <h3>Confiança Geral</h3>
                            <p class="trend positive">+12% desde última análise</p>
                            <p class="prediction">Convergência em 2 iterações</p>
                        </div>
                    </div>
                </div>
                
                <!-- Dimension Breakdown -->
                <div class="dimensions-section">
                    <h3>Análise por Dimensão</h3>
                    <div class="dimension-charts">
                        <canvas id="dimension-radar"></canvas>
                    </div>
                    <div class="dimension-details">
                        <!-- Dynamic dimension cards -->
                    </div>
                </div>
                
                <!-- Convergence Timeline -->
                <div class="convergence-section">
                    <h3>Evolução da Convergência</h3>
                    <div class="timeline-controls">
                        <button class="btn-sm" data-range="1h">1h</button>
                        <button class="btn-sm" data-range="24h">24h</button>
                        <button class="btn-sm active" data-range="7d">7d</button>
                        <button class="btn-sm" data-range="30d">30d</button>
                    </div>
                    <canvas id="convergence-chart"></canvas>
                </div>
                
                <!-- ML Algorithm Performance -->
                <div class="algorithm-section">
                    <h3>Performance dos Algoritmos</h3>
                    <div class="algorithm-comparison">
                        <canvas id="algorithm-chart"></canvas>
                    </div>
                    <div class="algorithm-selector">
                        <label>Algoritmo Ativo:</label>
                        <select id="active-algorithm">
                            <option value="ensemble">Weighted Ensemble</option>
                            <option value="neural">Neural-Inspired</option>
                            <option value="forest">Random Forest</option>
                            <option value="boosting">Gradient Boosting</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }
}
```

### 3. Version Timeline Component

**Purpose:** Visualize version history with confidence evolution

**Visual Requirements:**
```javascript
class VersionTimeline {
    render(versions) {
        return `
            <div class="version-timeline">
                <div class="timeline-header">
                    <h3>Histórico de Versões</h3>
                    <button class="btn-create-snapshot">
                        <svg class="icon-camera" />
                        Criar Snapshot
                    </button>
                </div>
                
                <div class="timeline-track">
                    ${versions.map((version, index) => `
                        <div class="version-node ${version.isCurrent ? 'current' : ''}" 
                             data-version-id="${version.versionId}">
                            <div class="node-marker">
                                <div class="confidence-indicator" 
                                     style="--confidence: ${version.confidence}">
                                </div>
                            </div>
                            <div class="node-content">
                                <div class="version-info">
                                    <span class="version-number">v${index + 1}</span>
                                    <span class="version-time">${this.formatTime(version.timestamp)}</span>
                                </div>
                                <div class="version-metadata">
                                    <span class="confidence-value">${Math.round(version.confidence * 100)}%</span>
                                    <span class="change-summary">${version.changeSummary}</span>
                                </div>
                                <div class="version-actions">
                                    <button class="btn-icon" title="Comparar">
                                        <svg class="icon-compare" />
                                    </button>
                                    <button class="btn-icon" title="Restaurar">
                                        <svg class="icon-restore" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="timeline-comparison" id="version-comparison">
                    <!-- Dynamic comparison view -->
                </div>
            </div>
        `;
    }
}
```

### 4. Convergence Visualization

**Purpose:** Real-time chart showing confidence convergence patterns

**Chart Requirements:**
```javascript
class ConvergenceChart {
    constructor(canvasId) {
        this.canvas = document.querySelector(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = {
            iterations: [],
            confidence: [],
            predictions: []
        };
        this.initialize();
    }
    
    initialize() {
        // Set canvas size
        this.resize();
        
        // Configure chart
        this.config = {
            padding: 40,
            gridLines: 10,
            colors: {
                actual: '#4F46E5',
                predicted: '#10B981',
                target: '#EF4444',
                grid: '#E5E7EB'
            }
        };
        
        // Initial render
        this.render();
    }
    
    addDataPoint(iteration, confidence, prediction) {
        this.data.iterations.push(iteration);
        this.data.confidence.push(confidence);
        this.data.predictions.push(prediction);
        
        // Keep last 50 points
        if (this.data.iterations.length > 50) {
            this.data.iterations.shift();
            this.data.confidence.shift();
            this.data.predictions.shift();
        }
        
        this.render();
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw target line
        this.drawTargetLine(0.85);
        
        // Draw confidence line
        this.drawLine(this.data.confidence, this.config.colors.actual, 2);
        
        // Draw prediction line
        this.drawLine(this.data.predictions, this.config.colors.predicted, 1, true);
        
        // Draw data points
        this.drawPoints();
        
        // Draw axes labels
        this.drawLabels();
    }
}
```

### 5. ML Configuration Panel

**Purpose:** Configure ML algorithms and parameters

**Component Design:**
```html
<div class="ml-config-panel">
    <div class="panel-header">
        <h3>Configuração ML</h3>
        <button class="btn-icon btn-collapse">
            <svg class="icon-chevron" />
        </button>
    </div>
    
    <div class="panel-content">
        <!-- Algorithm Selection -->
        <div class="config-section">
            <h4>Algoritmo Principal</h4>
            <div class="algorithm-cards">
                <label class="algorithm-card">
                    <input type="radio" name="algorithm" value="ensemble" checked>
                    <div class="card-content">
                        <svg class="icon-ensemble" />
                        <span>Weighted Ensemble</span>
                        <small>Melhor precisão geral</small>
                    </div>
                </label>
                <!-- More algorithm options -->
            </div>
        </div>
        
        <!-- Weight Configuration -->
        <div class="config-section">
            <h4>Pesos das Dimensões</h4>
            <div class="weight-sliders">
                <div class="weight-control">
                    <label>Semântico</label>
                    <input type="range" min="0" max="100" value="40" 
                           class="weight-slider" data-dimension="semantic">
                    <span class="weight-value">40%</span>
                </div>
                <!-- More dimension weights -->
            </div>
            <button class="btn-sm btn-optimize">
                <svg class="icon-magic" />
                Otimizar Automaticamente
            </button>
        </div>
        
        <!-- Convergence Settings -->
        <div class="config-section">
            <h4>Configurações de Convergência</h4>
            <div class="convergence-settings">
                <div class="setting-row">
                    <label>Meta de Confiança</label>
                    <input type="number" min="0" max="100" value="85" 
                           class="input-sm" id="target-confidence">
                    <span>%</span>
                </div>
                <div class="setting-row">
                    <label>Estratégia de Convergência</label>
                    <select class="select-sm" id="convergence-strategy">
                        <option value="adaptive">Adaptativa</option>
                        <option value="linear">Linear</option>
                        <option value="exponential">Exponencial</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
</div>
```

## Interaction Design

### 1. File Analysis Flow

```javascript
// User clicks analyze button
FileCard.onAnalyze = async (fileId) => {
    // Show loading state
    UI.showLoading(fileId);
    
    // Trigger analysis
    const metrics = await CurationPanel.analyzeFile(fileId);
    
    // Update UI with animation
    UI.animateConfidenceUpdate(fileId, metrics);
    
    // Show convergence prediction
    if (metrics.convergencePrediction.willConverge) {
        UI.showNotification({
            type: 'success',
            message: `Arquivo convergirá em ${metrics.convergencePrediction.estimatedIterations} iterações`,
            duration: 5000
        });
    }
};
```

### 2. Version Management Flow

```javascript
// User creates snapshot
VersionPanel.onCreateSnapshot = async () => {
    const dialog = UI.showDialog({
        title: 'Criar Snapshot',
        content: `
            <div class="snapshot-dialog">
                <div class="form-group">
                    <label>Motivo do Snapshot</label>
                    <textarea id="snapshot-reason" rows="3" 
                              placeholder="Descreva o motivo..."></textarea>
                </div>
                <div class="form-group">
                    <label>Tags (opcional)</label>
                    <input type="text" id="snapshot-tags" 
                           placeholder="tag1, tag2, tag3">
                </div>
            </div>
        `,
        buttons: [
            { text: 'Cancelar', action: 'cancel' },
            { text: 'Criar Snapshot', action: 'create', primary: true }
        ]
    });
    
    const result = await dialog.show();
    
    if (result.action === 'create') {
        const versionId = await KC.AppState.createFileSnapshot(currentFileId, {
            reason: result.data.reason,
            tags: result.data.tags.split(',').map(t => t.trim()),
            confidence: currentConfidence
        });
        
        UI.showSuccess('Snapshot criado com sucesso');
        VersionTimeline.refresh();
    }
};
```

### 3. Batch Operations

```javascript
// Batch analysis UI
class BatchOperations {
    showBatchAnalysis(selectedFiles) {
        const panel = UI.showPanel({
            title: `Analisar ${selectedFiles.length} arquivos`,
            position: 'bottom',
            content: `
                <div class="batch-analysis">
                    <div class="batch-options">
                        <label>
                            <input type="checkbox" checked> 
                            Criar snapshots antes da análise
                        </label>
                        <label>
                            <input type="checkbox" checked>
                            Parar se confiança > 90%
                        </label>
                    </div>
                    <div class="batch-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">0 de ${selectedFiles.length}</div>
                    </div>
                    <div class="batch-results">
                        <!-- Dynamic results -->
                    </div>
                </div>
            `
        });
        
        this.processBatch(selectedFiles, panel);
    }
}
```

## Responsive Design Requirements

### Breakpoints
```css
/* Mobile: 320px - 768px */
@media (max-width: 768px) {
    .file-grid {
        grid-template-columns: 1fr;
    }
    
    .side-panels {
        position: fixed;
        transform: translateX(-100%);
    }
}

/* Tablet: 769px - 1024px */
@media (min-width: 769px) and (max-width: 1024px) {
    .file-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Desktop: 1025px+ */
@media (min-width: 1025px) {
    .file-grid {
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }
}
```

## Accessibility Requirements

### ARIA Labels and Roles
```html
<div class="curation-panel" role="main" aria-label="Painel de Curadoria">
    <div class="file-card" 
         role="article" 
         aria-label="Arquivo: knowledge-base-001.md"
         tabindex="0">
        <div class="confidence-badge" 
             role="meter" 
             aria-valuenow="85" 
             aria-valuemin="0" 
             aria-valuemax="100"
             aria-label="Confiança: 85%">
        </div>
    </div>
</div>
```

### Keyboard Navigation
```javascript
class KeyboardNavigation {
    constructor() {
        this.focusableElements = [];
        this.currentIndex = 0;
        this.bindEvents();
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'Tab':
                    e.preventDefault();
                    this.navigateNext(e.shiftKey);
                    break;
                case 'Enter':
                case ' ':
                    this.activateCurrent();
                    break;
                case 'Escape':
                    this.closePanels();
                    break;
            }
        });
    }
}
```

## Performance Requirements

### Rendering Performance
- Virtual scrolling for lists > 100 items
- Debounced search and filter operations
- Progressive image loading for file previews
- RequestAnimationFrame for smooth animations

### Data Loading
- Lazy load file details on demand
- Paginate large result sets
- Cache calculated metrics for 5 minutes
- Preload next page of results

## Theme Support

### CSS Variables
```css
:root {
    /* Light theme (default) */
    --color-primary: #4F46E5;
    --color-surface: #FFFFFF;
    --color-background: #F9FAFB;
    --color-text: #111827;
    --color-confidence-low: #EF4444;
    --color-confidence-medium: #F59E0B;
    --color-confidence-high: #10B981;
}

[data-theme="dark"] {
    --color-primary: #6366F1;
    --color-surface: #1F2937;
    --color-background: #111827;
    --color-text: #F9FAFB;
    --color-confidence-low: #F87171;
    --color-confidence-medium: #FBBF24;
    --color-confidence-high: #34D399;
}
```

## Animation Requirements

### Micro-interactions
```css
/* Confidence update animation */
@keyframes confidencePulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
}

.confidence-updating {
    animation: confidencePulse 0.6s ease-in-out;
}

/* Chart drawing animation */
.chart-line {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: drawLine 1.5s ease-out forwards;
}

@keyframes drawLine {
    to { stroke-dashoffset: 0; }
}
```

## Implementation Priority

### Phase 1: Core Functionality (Days 1-2)
1. Basic file grid/list view
2. Simple confidence display
3. Manual analysis trigger
4. Basic version indicator

### Phase 2: Enhanced Visualization (Days 3-4)
1. Confidence dashboard
2. Convergence charts
3. Version timeline
4. ML configuration panel

### Phase 3: Advanced Features (Week 2)
1. Batch operations
2. Comparison views
3. Export functionality
4. Keyboard shortcuts

## Success Metrics

### User Experience Metrics
- Time to first meaningful paint: < 1.5s
- Interaction response time: < 100ms
- Analysis completion feedback: < 3s
- Error recovery time: < 5s

### Functional Metrics
- All Wave 1 components integrated
- Real-time confidence updates working
- Version control accessible
- ML configuration functional

## Conclusion

The CurationPanel UI must balance sophisticated ML functionality with intuitive user experience. By following these requirements and implementing in phases, the UI will provide powerful curation capabilities while maintaining the simplicity and elegance of the KC design system.
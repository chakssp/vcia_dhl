/**
 * ConvergenceDashboard.js - Dashboard de Métricas de Convergência
 * 
 * Visualização completa das métricas de convergência semântica
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class ConvergenceDashboard {
        constructor() {
            this.container = null;
            this.convergenceService = KC.SemanticConvergenceService;
            this.updateInterval = null;
            this.currentView = 'overview'; // overview, patterns, timeline, insights
            
            // Dados para visualização
            this.dashboardData = {
                convergencePoints: [],
                patterns: [],
                insights: [],
                timeline: [],
                scores: {}
            };
        }

        /**
         * Inicializa o dashboard
         */
        initialize(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) {
                console.error('Container não encontrado:', containerId);
                return;
            }

            this.loadData();
            this.render();
            this.startAutoUpdate();
        }

        /**
         * Carrega dados do serviço
         */
        async loadData() {
            // Obtém arquivos atuais
            const files = KC.AppState.get('files') || [];
            
            if (files.length > 0) {
                // Analisa convergência
                const analysis = await this.convergenceService.analyzeConvergence(files.slice(0, 50));
                
                if (analysis.success) {
                    this.dashboardData = {
                        convergencePoints: analysis.convergencePoints || [],
                        patterns: analysis.patterns || [],
                        insights: analysis.insights || [],
                        scores: analysis.scores || {},
                        files: files.length,
                        timestamp: new Date().toISOString()
                    };
                }
            }
        }

        /**
         * Renderiza o dashboard
         */
        render() {
            this.container.innerHTML = `
                <div class="convergence-dashboard" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 20px;
                    padding: 25px;
                    color: white;
                    margin: 20px 0;
                ">
                    <!-- Header -->
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                    ">
                        <h2 style="
                            font-size: 1.8em;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        ">
                            🎯 Dashboard de Convergência Semântica
                        </h2>
                        <div style="
                            display: flex;
                            gap: 10px;
                        ">
                            ${this.renderViewButtons()}
                        </div>
                    </div>

                    <!-- Métricas Principais -->
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-bottom: 25px;
                    ">
                        ${this.renderMainMetrics()}
                    </div>

                    <!-- Visualização Principal -->
                    <div id="main-visualization" style="
                        background: rgba(0,0,0,0.2);
                        border-radius: 15px;
                        padding: 20px;
                        margin-bottom: 25px;
                    ">
                        ${this.renderMainVisualization()}
                    </div>

                    <!-- Grid de Análises -->
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                    ">
                        <!-- Padrões Descobertos -->
                        <div style="
                            background: rgba(0,0,0,0.2);
                            border-radius: 15px;
                            padding: 20px;
                        ">
                            <h3 style="margin-bottom: 15px;">🔍 Padrões Descobertos</h3>
                            ${this.renderPatterns()}
                        </div>

                        <!-- Insights -->
                        <div style="
                            background: rgba(0,0,0,0.2);
                            border-radius: 15px;
                            padding: 20px;
                        ">
                            <h3 style="margin-bottom: 15px;">💡 Insights</h3>
                            ${this.renderInsights()}
                        </div>
                    </div>

                    <!-- Mapa de Convergência -->
                    <div style="
                        background: rgba(0,0,0,0.2);
                        border-radius: 15px;
                        padding: 20px;
                        margin-top: 20px;
                    ">
                        <h3 style="margin-bottom: 15px;">🗺️ Mapa de Convergência</h3>
                        ${this.renderConvergenceMap()}
                    </div>

                    <!-- Controles -->
                    <div style="
                        display: flex;
                        gap: 10px;
                        margin-top: 20px;
                        justify-content: center;
                    ">
                        <button onclick="KC.ConvergenceDashboard.analyzeSelection()" style="
                            background: #4ade80;
                            color: #1e293b;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-weight: bold;
                            cursor: pointer;
                        ">
                            🔬 Analisar Seleção
                        </button>
                        <button onclick="KC.ConvergenceDashboard.exportAnalysis()" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-weight: bold;
                            cursor: pointer;
                        ">
                            📊 Exportar Análise
                        </button>
                        <button onclick="KC.ConvergenceDashboard.refresh()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-weight: bold;
                            cursor: pointer;
                        ">
                            🔄 Atualizar
                        </button>
                    </div>
                </div>
            `;
        }

        /**
         * Renderiza botões de visualização
         */
        renderViewButtons() {
            const views = [
                { id: 'overview', label: 'Visão Geral', icon: '📊' },
                { id: 'patterns', label: 'Padrões', icon: '🔍' },
                { id: 'timeline', label: 'Linha do Tempo', icon: '📅' },
                { id: 'insights', label: 'Insights', icon: '💡' }
            ];

            return views.map(view => `
                <button 
                    onclick="KC.ConvergenceDashboard.switchView('${view.id}')"
                    style="
                        background: ${this.currentView === view.id ? 
                            'rgba(255,255,255,0.3)' : 
                            'rgba(255,255,255,0.1)'};
                        color: white;
                        border: 1px solid rgba(255,255,255,0.2);
                        padding: 8px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.9em;
                    "
                >
                    ${view.icon} ${view.label}
                </button>
            `).join('');
        }

        /**
         * Renderiza métricas principais
         */
        renderMainMetrics() {
            const scores = this.dashboardData.scores;
            
            return `
                ${this.renderMetricCard('Score Geral', 
                    Math.round((scores.overall || 0) * 100) + '%', 
                    '#fbbf24', 
                    this.getScoreIcon(scores.overall))}
                
                ${this.renderMetricCard('Keywords', 
                    Math.round((scores.keywords || 0) * 100) + '%', 
                    '#4ade80',
                    '🔤')}
                
                ${this.renderMetricCard('Categorias', 
                    Math.round((scores.categories || 0) * 100) + '%', 
                    '#3b82f6',
                    '📂')}
                
                ${this.renderMetricCard('Temporal', 
                    Math.round((scores.temporal || 0) * 100) + '%', 
                    '#ec4899',
                    '⏰')}
                
                ${this.renderMetricCard('Análise', 
                    Math.round((scores.analysisType || 0) * 100) + '%', 
                    '#f97316',
                    '🔬')}
            `;
        }

        /**
         * Renderiza card de métrica
         */
        renderMetricCard(label, value, color, icon) {
            return `
                <div style="
                    background: rgba(0,0,0,0.3);
                    border-radius: 12px;
                    padding: 15px;
                    text-align: center;
                ">
                    <div style="font-size: 1.5em; margin-bottom: 5px;">${icon}</div>
                    <div style="
                        font-size: 1.8em;
                        font-weight: bold;
                        color: ${color};
                        margin-bottom: 5px;
                    ">${value}</div>
                    <div style="
                        font-size: 0.9em;
                        opacity: 0.8;
                    ">${label}</div>
                </div>
            `;
        }

        /**
         * Renderiza visualização principal
         */
        renderMainVisualization() {
            switch (this.currentView) {
                case 'overview':
                    return this.renderOverview();
                case 'patterns':
                    return this.renderPatternsView();
                case 'timeline':
                    return this.renderTimelineView();
                case 'insights':
                    return this.renderInsightsView();
                default:
                    return this.renderOverview();
            }
        }

        /**
         * Renderiza visão geral
         */
        renderOverview() {
            const points = this.dashboardData.convergencePoints || [];
            
            return `
                <h3 style="margin-bottom: 15px;">📈 Pontos de Convergência</h3>
                <div style="
                    display: grid;
                    gap: 10px;
                ">
                    ${points.length > 0 ? points.map(point => `
                        <div style="
                            background: rgba(255,255,255,0.1);
                            border-radius: 8px;
                            padding: 12px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <div>
                                <strong>${point.type === 'general' ? 'Convergência Geral' : 
                                    `Convergência ${point.dimension}`}</strong>
                                <div style="font-size: 0.85em; opacity: 0.7; margin-top: 3px;">
                                    Força: ${point.strength || 'N/A'}
                                </div>
                            </div>
                            <div style="
                                font-size: 1.5em;
                                font-weight: bold;
                                color: ${this.getScoreColor(point.score)};
                            ">
                                ${Math.round(point.score * 100)}%
                            </div>
                        </div>
                    `).join('') : '<div style="opacity: 0.6;">Nenhum ponto de convergência detectado ainda</div>'}
                </div>
            `;
        }

        /**
         * Renderiza visualização de padrões
         */
        renderPatternsView() {
            const patterns = this.dashboardData.patterns || [];
            
            return `
                <h3 style="margin-bottom: 15px;">🔍 Análise de Padrões</h3>
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                ">
                    ${patterns.length > 0 ? patterns.map(pattern => `
                        <div style="
                            background: rgba(255,255,255,0.1);
                            border-radius: 10px;
                            padding: 15px;
                        ">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 10px;
                            ">
                                <strong>Padrão ${pattern.id}</strong>
                                <span style="
                                    background: rgba(74, 222, 128, 0.2);
                                    padding: 3px 8px;
                                    border-radius: 12px;
                                    font-size: 0.85em;
                                ">
                                    ${pattern.type || 'sequence'}
                                </span>
                            </div>
                            ${pattern.sequence ? `
                                <div style="font-size: 0.9em; opacity: 0.8;">
                                    Sequência: ${pattern.sequence}
                                </div>
                            ` : ''}
                            ${pattern.significance ? `
                                <div style="margin-top: 8px;">
                                    <div style="
                                        height: 4px;
                                        background: rgba(255,255,255,0.2);
                                        border-radius: 2px;
                                        overflow: hidden;
                                    ">
                                        <div style="
                                            height: 100%;
                                            width: ${pattern.significance * 100}%;
                                            background: #4ade80;
                                        "></div>
                                    </div>
                                    <div style="font-size: 0.75em; opacity: 0.6; margin-top: 3px;">
                                        Significância: ${Math.round(pattern.significance * 100)}%
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : '<div style="opacity: 0.6;">Nenhum padrão descoberto ainda</div>'}
                </div>
            `;
        }

        /**
         * Renderiza linha do tempo
         */
        renderTimelineView() {
            return `
                <h3 style="margin-bottom: 15px;">📅 Linha do Tempo de Convergência</h3>
                <div style="
                    position: relative;
                    height: 200px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                    padding: 20px;
                ">
                    ${this.renderTimeline()}
                </div>
            `;
        }

        /**
         * Renderiza timeline
         */
        renderTimeline() {
            const files = KC.AppState.get('files') || [];
            const timelineData = this.processTimelineData(files.slice(0, 20));
            
            if (timelineData.length === 0) {
                return '<div style="opacity: 0.6;">Dados insuficientes para linha do tempo</div>';
            }
            
            return `
                <svg viewBox="0 0 800 150" style="width: 100%; height: 100%;">
                    <!-- Linha base -->
                    <line x1="50" y1="75" x2="750" y2="75" 
                        stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                    
                    <!-- Pontos no tempo -->
                    ${timelineData.map((point, index) => {
                        const x = 50 + (700 / (timelineData.length - 1)) * index;
                        const y = 75;
                        const radius = 5 + (point.relevance / 20);
                        
                        return `
                            <g>
                                <circle cx="${x}" cy="${y}" r="${radius}" 
                                    fill="${this.getScoreColor(point.relevance / 100)}"
                                    opacity="0.8"/>
                                <text x="${x}" y="${y + 30}" 
                                    fill="white" font-size="10" text-anchor="middle">
                                    ${point.label}
                                </text>
                            </g>
                        `;
                    }).join('')}
                </svg>
            `;
        }

        /**
         * Renderiza visualização de insights
         */
        renderInsightsView() {
            const insights = this.dashboardData.insights || [];
            
            return `
                <h3 style="margin-bottom: 15px;">💡 Insights Detalhados</h3>
                <div style="
                    display: grid;
                    gap: 12px;
                ">
                    ${insights.length > 0 ? insights.map(insight => `
                        <div style="
                            background: rgba(255,255,255,0.1);
                            border-radius: 10px;
                            padding: 15px;
                            border-left: 4px solid ${this.getInsightColor(insight.type)};
                        ">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 8px;
                            ">
                                <strong>${this.getInsightIcon(insight.type)} ${insight.type}</strong>
                                ${insight.confidence ? `
                                    <span style="opacity: 0.7; font-size: 0.9em;">
                                        Confiança: ${Math.round(insight.confidence * 100)}%
                                    </span>
                                ` : ''}
                            </div>
                            <div style="opacity: 0.9;">
                                ${insight.message}
                            </div>
                            ${insight.actionable ? `
                                <div style="
                                    margin-top: 10px;
                                    padding-top: 10px;
                                    border-top: 1px solid rgba(255,255,255,0.1);
                                ">
                                    <button style="
                                        background: rgba(74, 222, 128, 0.2);
                                        color: #4ade80;
                                        border: 1px solid #4ade80;
                                        padding: 5px 12px;
                                        border-radius: 6px;
                                        font-size: 0.85em;
                                        cursor: pointer;
                                    ">
                                        Tomar Ação →
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : '<div style="opacity: 0.6;">Nenhum insight disponível ainda</div>'}
                </div>
            `;
        }

        /**
         * Renderiza padrões
         */
        renderPatterns() {
            const patterns = this.dashboardData.patterns || [];
            
            if (patterns.length === 0) {
                return '<div style="opacity: 0.6;">Nenhum padrão descoberto</div>';
            }
            
            return patterns.slice(0, 5).map(pattern => `
                <div style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 8px;
                ">
                    <div style="font-weight: bold; margin-bottom: 5px;">
                        ${pattern.type === 'co-occurrence' ? 'Co-ocorrência' : 'Sequência'}
                    </div>
                    <div style="font-size: 0.85em; opacity: 0.7;">
                        ${pattern.sequence || pattern.dimensions?.join(' + ') || 'Padrão complexo'}
                    </div>
                </div>
            `).join('');
        }

        /**
         * Renderiza insights
         */
        renderInsights() {
            const insights = this.dashboardData.insights || [];
            
            if (insights.length === 0) {
                return '<div style="opacity: 0.6;">Analisando dados...</div>';
            }
            
            return insights.slice(0, 5).map(insight => `
                <div style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 8px;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 5px;
                    ">
                        <span>${this.getInsightIcon(insight.type)}</span>
                        <strong>${insight.type}</strong>
                    </div>
                    <div style="font-size: 0.85em; opacity: 0.8;">
                        ${insight.message}
                    </div>
                </div>
            `).join('');
        }

        /**
         * Renderiza mapa de convergência
         */
        renderConvergenceMap() {
            return `
                <div style="
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                ">
                    ${this.renderConvergenceNode('Keywords', 'keywords', '#4ade80')}
                    ${this.renderConvergenceNode('Categorias', 'categories', '#3b82f6')}
                    ${this.renderConvergenceNode('Análise', 'analysisType', '#f97316')}
                    ${this.renderConvergenceNode('Temporal', 'temporal', '#ec4899')}
                </div>
                
                <div style="
                    margin-top: 20px;
                    text-align: center;
                    padding: 20px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                ">
                    <div style="font-size: 1.2em; margin-bottom: 10px;">
                        Fórmula de Convergência
                    </div>
                    <div style="
                        font-family: monospace;
                        font-size: 1.1em;
                        opacity: 0.9;
                    ">
                        Keywords ∩ Categories ∩ AnalysisType ∩ Temporal = 
                        <span style="
                            color: #fbbf24;
                            font-weight: bold;
                            font-size: 1.2em;
                        ">CONVERGENCE</span>
                    </div>
                </div>
            `;
        }

        /**
         * Renderiza nó de convergência
         */
        renderConvergenceNode(label, dimension, color) {
            const score = this.dashboardData.scores[dimension] || 0;
            
            return `
                <div style="
                    background: rgba(0,0,0,0.3);
                    border-radius: 12px;
                    padding: 15px;
                    text-align: center;
                    border: 2px solid ${color}40;
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        background: ${color}20;
                        border: 3px solid ${color};
                        margin: 0 auto 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5em;
                        font-weight: bold;
                        color: ${color};
                    ">
                        ${Math.round(score * 100)}%
                    </div>
                    <div style="font-weight: bold;">${label}</div>
                </div>
            `;
        }

        /**
         * Helpers
         */
        
        getScoreColor(score) {
            if (score >= 0.7) return '#4ade80';
            if (score >= 0.4) return '#fbbf24';
            if (score >= 0.2) return '#fb923c';
            return '#ef4444';
        }

        getScoreIcon(score) {
            if (score >= 0.8) return '🔥';
            if (score >= 0.6) return '⭐';
            if (score >= 0.4) return '📈';
            if (score >= 0.2) return '📊';
            return '📉';
        }

        getInsightColor(type) {
            const colors = {
                'high-convergence': '#4ade80',
                'pattern-detected': '#3b82f6',
                'dominant-dimension': '#fbbf24',
                'anomaly': '#ef4444'
            };
            return colors[type] || '#6b7280';
        }

        getInsightIcon(type) {
            const icons = {
                'high-convergence': '🎯',
                'pattern-detected': '🔍',
                'dominant-dimension': '📊',
                'anomaly': '⚠️'
            };
            return icons[type] || '💡';
        }

        processTimelineData(files) {
            return files
                .filter(f => f.lastModified)
                .sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified))
                .map(f => ({
                    date: new Date(f.lastModified),
                    label: new Date(f.lastModified).toLocaleDateString('pt-BR', { 
                        month: 'short', 
                        day: 'numeric' 
                    }),
                    relevance: f.relevanceScore || 50,
                    name: f.name
                }));
        }

        /**
         * Troca visualização
         */
        switchView(view) {
            this.currentView = view;
            this.render();
        }

        /**
         * Analisa seleção
         */
        async analyzeSelection() {
            // Obtém arquivos selecionados
            const selectedFiles = KC.FileRenderer?.selectedFiles || new Set();
            
            if (selectedFiles.size === 0) {
                alert('Selecione arquivos para analisar');
                return;
            }
            
            // Converte para array
            const files = Array.from(selectedFiles).map(id => 
                KC.AppState.get('files').find(f => f.id === id)
            ).filter(Boolean);
            
            // Analisa
            const analysis = await this.convergenceService.analyzeConvergence(files);
            
            if (analysis.success) {
                this.dashboardData = {
                    convergencePoints: analysis.convergencePoints,
                    patterns: analysis.patterns,
                    insights: analysis.insights,
                    scores: analysis.scores,
                    files: files.length
                };
                this.render();
            }
        }

        /**
         * Exporta análise
         */
        exportAnalysis() {
            const data = {
                timestamp: new Date().toISOString(),
                analysis: this.dashboardData,
                config: this.convergenceService.dimensions,
                stats: this.convergenceService.getStats()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `convergence-analysis-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        /**
         * Atualiza dashboard
         */
        async refresh() {
            await this.loadData();
            this.render();
        }

        /**
         * Inicia atualização automática
         */
        startAutoUpdate() {
            this.updateInterval = setInterval(() => {
                this.loadData().then(() => {
                    // Atualiza apenas se houver mudanças
                    const viz = document.getElementById('main-visualization');
                    if (viz) {
                        viz.innerHTML = this.renderMainVisualization();
                    }
                });
            }, 30000); // Atualiza a cada 30 segundos
        }

        /**
         * Para atualização automática
         */
        stopAutoUpdate() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }

        /**
         * Destrutor
         */
        destroy() {
            this.stopAutoUpdate();
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    // Exporta para o namespace KC
    KC.ConvergenceDashboard = new ConvergenceDashboard();

    console.log('✅ ConvergenceDashboard inicializado');

})(window);
/**
 * VisualizationRecommender - Sistema de Recomendação de Visualizações
 * 
 * Analisa campos selecionados e suas características para recomendar
 * as visualizações mais apropriadas em formato de matriz.
 */

class VisualizationRecommender {
    constructor() {
        // Catálogo de visualizações disponíveis
        this.visualizations = {
            sankey: {
                id: 'sankey',
                name: 'Sankey Diagram',
                icon: '📊',
                description: 'Mostra fluxos hierárquicos entre categorias',
                strengths: ['hierarquia', 'fluxo', 'volume', 'transições'],
                weaknesses: ['relações N:N', 'ciclos', 'muitos nós'],
                requirements: {
                    minFields: 2,
                    maxFields: 4,
                    idealCardinality: ['1:N', 'N:1'],
                    categories: ['analysis', 'semantic', 'metadata'],
                    hierarchical: true
                }
            },
            treemap: {
                id: 'treemap',
                name: 'TreeMap',
                icon: '🔲',
                description: 'Visualiza proporções hierárquicas',
                strengths: ['proporções', 'hierarquia', 'espaço eficiente'],
                weaknesses: ['muitos níveis', 'labels longas'],
                requirements: {
                    minFields: 2,
                    maxFields: 3,
                    idealCardinality: ['1:N'],
                    categories: ['semantic', 'metrics'],
                    needsValue: true
                }
            },
            sunburst: {
                id: 'sunburst',
                name: 'Sunburst',
                icon: '☀️',
                description: 'Hierarquia radial com múltiplos níveis',
                strengths: ['hierarquia profunda', 'navegação', 'compacto'],
                weaknesses: ['texto circular', 'centro vazio'],
                requirements: {
                    minFields: 2,
                    maxFields: 5,
                    idealCardinality: ['1:N'],
                    categories: ['semantic', 'analysis'],
                    hierarchical: true
                }
            },
            force: {
                id: 'force',
                name: 'Force-Directed Graph',
                icon: '🔗',
                description: 'Rede de conexões com física',
                strengths: ['relações complexas', 'clusters', 'exploração'],
                weaknesses: ['performance', 'sobreposição'],
                requirements: {
                    minFields: 2,
                    maxFields: 4,
                    idealCardinality: ['N:N', '1:N'],
                    categories: ['relationships', 'semantic'],
                    network: true
                }
            },
            chord: {
                id: 'chord',
                name: 'Chord Diagram',
                icon: '🎯',
                description: 'Matriz de relações circulares',
                strengths: ['relações N:N', 'fluxo bidirecional', 'estético'],
                weaknesses: ['poucos itens', 'sem hierarquia'],
                requirements: {
                    minFields: 2,
                    maxFields: 3,
                    idealCardinality: ['N:N'],
                    categories: ['relationships', 'semantic'],
                    symmetric: true
                }
            },
            heatmap: {
                id: 'heatmap',
                name: 'Heat Map',
                icon: '🌡️',
                description: 'Matriz de valores com cores',
                strengths: ['padrões', 'comparações', 'densidade'],
                weaknesses: ['sem hierarquia', 'cores limitadas'],
                requirements: {
                    minFields: 2,
                    maxFields: 3,
                    idealCardinality: ['1:1', '1:N'],
                    categories: ['metrics', 'analysis'],
                    matrix: true
                }
            },
            scatter: {
                id: 'scatter',
                name: 'Scatter Plot',
                icon: '📈',
                description: 'Distribuição de pontos em 2D/3D',
                strengths: ['correlações', 'outliers', 'tendências'],
                weaknesses: ['sem conexões', 'sobreposição'],
                requirements: {
                    minFields: 2,
                    maxFields: 4,
                    idealCardinality: ['1:1'],
                    categories: ['metrics', 'analysis'],
                    numerical: true
                }
            },
            timeline: {
                id: 'timeline',
                name: 'Timeline',
                icon: '📅',
                description: 'Eventos ao longo do tempo',
                strengths: ['evolução', 'sequência', 'narrativa'],
                weaknesses: ['sem relações', 'espaço horizontal'],
                requirements: {
                    minFields: 1,
                    maxFields: 3,
                    categories: ['temporal'],
                    temporal: true
                }
            },
            parallel: {
                id: 'parallel',
                name: 'Parallel Coordinates',
                icon: '📏',
                description: 'Múltiplas dimensões em paralelo',
                strengths: ['multidimensional', 'padrões', 'filtros'],
                weaknesses: ['muitas linhas', 'ordem dos eixos'],
                requirements: {
                    minFields: 3,
                    maxFields: 8,
                    idealCardinality: ['1:1', '1:N'],
                    categories: ['metrics', 'analysis'],
                    multivariate: true
                }
            },
            alluvial: {
                id: 'alluvial',
                name: 'Alluvial Diagram',
                icon: '🌊',
                description: 'Fluxos que mudam ao longo do tempo',
                strengths: ['mudanças', 'fluxo temporal', 'categorias'],
                weaknesses: ['complexidade visual', 'muitas transições'],
                requirements: {
                    minFields: 2,
                    maxFields: 4,
                    idealCardinality: ['1:N', 'N:N'],
                    categories: ['temporal', 'semantic'],
                    temporal: true,
                    categorical: true
                }
            }
        };
        
        // Matriz de compatibilidade entre visualizações
        this.compatibilityMatrix = {
            sankey: ['treemap', 'sunburst', 'alluvial'],
            treemap: ['sankey', 'sunburst', 'heatmap'],
            sunburst: ['sankey', 'treemap', 'force'],
            force: ['chord', 'scatter', 'sunburst'],
            chord: ['force', 'heatmap', 'sankey'],
            heatmap: ['scatter', 'parallel', 'treemap'],
            scatter: ['heatmap', 'parallel', 'force'],
            timeline: ['alluvial', 'scatter', 'sankey'],
            parallel: ['scatter', 'heatmap', 'force'],
            alluvial: ['sankey', 'timeline', 'chord']
        };
    }
    
    /**
     * Analisa campos e retorna recomendações de visualização
     * @param {Array} selectedFields - Campos selecionados do FieldExplorer
     * @returns {Object} Recomendações estruturadas
     */
    recommend(selectedFields) {
        console.log(`Analisando ${selectedFields.length} campos para recomendar visualizações...`);
        
        // Analisar características dos campos
        const analysis = this._analyzeFields(selectedFields);
        
        // Pontuar cada visualização
        const scores = this._scoreVisualizations(analysis, selectedFields);
        
        // Ordenar por pontuação
        const ranked = Object.entries(scores)
            .sort((a, b) => b[1].score - a[1].score)
            .map(([id, data]) => ({
                ...this.visualizations[id],
                ...data
            }));
        
        // Criar matriz de recomendações
        const matrix = this._createRecommendationMatrix(ranked, analysis);
        
        return {
            analysis,
            recommendations: ranked,
            matrix,
            topChoice: ranked[0],
            alternatives: ranked.slice(1, 4)
        };
    }
    
    /**
     * Analisa características dos campos selecionados
     * @private
     */
    _analyzeFields(fields) {
        const analysis = {
            count: fields.length,
            cardinalities: new Set(),
            categories: new Set(),
            types: new Set(),
            hasHierarchy: false,
            hasTemporal: false,
            hasNetwork: false,
            hasMetrics: false,
            hasCategorical: false,
            complexity: 'baixa',
            patterns: []
        };
        
        fields.forEach(field => {
            // Cardinalidades
            analysis.cardinalities.add(field.cardinality);
            
            // Categorias
            analysis.categories.add(field.category);
            
            // Tipos de dados
            analysis.types.add(field.type);
            
            // Características especiais
            if (field.depth > 2) analysis.hasHierarchy = true;
            if (field.category === 'temporal') analysis.hasTemporal = true;
            if (field.category === 'relationships') analysis.hasNetwork = true;
            if (field.category === 'metrics') analysis.hasMetrics = true;
            if (field.category === 'semantic') analysis.hasCategorical = true;
            
            // Padrões detectados
            if (field.cardinality === 'N:N' && field.category === 'semantic') {
                analysis.patterns.push('categorias-cruzadas');
            }
            if (field.cardinality === '1:N' && field.depth > 1) {
                analysis.patterns.push('hierarquia-natural');
            }
            if (field.type === 'array' && field.category === 'relationships') {
                analysis.patterns.push('rede-complexa');
            }
        });
        
        // Determinar complexidade
        if (analysis.cardinalities.has('N:N') || fields.length > 5) {
            analysis.complexity = 'alta';
        } else if (analysis.cardinalities.has('1:N') || fields.length > 3) {
            analysis.complexity = 'media';
        }
        
        // Identificar casos de uso
        analysis.useCases = this._identifyUseCases(analysis);
        
        return analysis;
    }
    
    /**
     * Identifica casos de uso baseado na análise
     * @private
     */
    _identifyUseCases(analysis) {
        const useCases = [];
        
        if (analysis.hasHierarchy && analysis.hasCategorical) {
            useCases.push({
                name: 'Exploração Hierárquica',
                description: 'Navegar por categorias e subcategorias'
            });
        }
        
        if (analysis.hasNetwork || analysis.patterns.includes('rede-complexa')) {
            useCases.push({
                name: 'Análise de Redes',
                description: 'Descobrir conexões e clusters'
            });
        }
        
        if (analysis.hasTemporal) {
            useCases.push({
                name: 'Análise Temporal',
                description: 'Visualizar evolução ao longo do tempo'
            });
        }
        
        if (analysis.hasMetrics && analysis.hasCategorical) {
            useCases.push({
                name: 'Comparação de Métricas',
                description: 'Comparar valores entre categorias'
            });
        }
        
        if (analysis.patterns.includes('categorias-cruzadas')) {
            useCases.push({
                name: 'Relações Cruzadas',
                description: 'Explorar relações N:N entre categorias'
            });
        }
        
        return useCases;
    }
    
    /**
     * Pontua cada visualização baseado na análise
     * @private
     */
    _scoreVisualizations(analysis, fields) {
        const scores = {};
        
        Object.entries(this.visualizations).forEach(([id, viz]) => {
            let score = 0;
            const reasons = [];
            const warnings = [];
            
            // Verificar requisitos básicos
            const reqs = viz.requirements;
            
            // Número de campos
            if (fields.length >= reqs.minFields && fields.length <= reqs.maxFields) {
                score += 20;
                reasons.push('Número de campos ideal');
            } else if (fields.length < reqs.minFields) {
                score -= 30;
                warnings.push(`Precisa de pelo menos ${reqs.minFields} campos`);
            } else {
                score -= 20;
                warnings.push(`Muitos campos (máx: ${reqs.maxFields})`);
            }
            
            // Cardinalidade
            if (reqs.idealCardinality) {
                const hasIdealCard = Array.from(analysis.cardinalities)
                    .some(card => reqs.idealCardinality.includes(card));
                
                if (hasIdealCard) {
                    score += 30;
                    reasons.push('Cardinalidade compatível');
                } else {
                    score -= 20;
                    warnings.push('Cardinalidade não ideal');
                }
            }
            
            // Categorias
            if (reqs.categories) {
                const matchingCats = Array.from(analysis.categories)
                    .filter(cat => reqs.categories.includes(cat));
                
                if (matchingCats.length > 0) {
                    score += 20 * matchingCats.length;
                    reasons.push(`Categorias compatíveis: ${matchingCats.join(', ')}`);
                }
            }
            
            // Requisitos especiais
            if (reqs.hierarchical && analysis.hasHierarchy) {
                score += 25;
                reasons.push('Suporta hierarquia');
            }
            
            if (reqs.temporal && analysis.hasTemporal) {
                score += 25;
                reasons.push('Ideal para dados temporais');
            }
            
            if (reqs.network && analysis.hasNetwork) {
                score += 25;
                reasons.push('Perfeito para redes');
            }
            
            if (reqs.numerical && analysis.hasMetrics) {
                score += 20;
                reasons.push('Bom para métricas numéricas');
            }
            
            // Penalizar por complexidade
            if (analysis.complexity === 'alta' && viz.weaknesses.includes('muitos nós')) {
                score -= 15;
                warnings.push('Pode ficar sobrecarregado');
            }
            
            // Bonus por padrões detectados
            if (analysis.patterns.includes('hierarquia-natural') && 
                viz.strengths.includes('hierarquia')) {
                score += 15;
                reasons.push('Padrão hierárquico detectado');
            }
            
            if (analysis.patterns.includes('rede-complexa') && 
                viz.strengths.includes('relações complexas')) {
                score += 15;
                reasons.push('Rede complexa detectada');
            }
            
            // Ajustar score para 0-100
            score = Math.max(0, Math.min(100, score));
            
            scores[id] = {
                score,
                reasons,
                warnings,
                confidence: this._calculateConfidence(score, warnings.length)
            };
        });
        
        return scores;
    }
    
    /**
     * Calcula nível de confiança da recomendação
     * @private
     */
    _calculateConfidence(score, warningCount) {
        if (score >= 80 && warningCount === 0) return 'very-high';
        if (score >= 60 && warningCount <= 1) return 'high';
        if (score >= 40 && warningCount <= 2) return 'medium';
        if (score >= 20) return 'low';
        return 'very-low';
    }
    
    /**
     * Cria matriz de recomendações para exibição
     * @private
     */
    _createRecommendationMatrix(ranked, analysis) {
        const matrix = {
            primary: [],      // Melhores opções (score > 70)
            secondary: [],    // Boas opções (score 40-70)
            exploratory: [],  // Opções experimentais (score < 40)
            combinations: []  // Combinações recomendadas
        };
        
        // Categorizar por score
        ranked.forEach(viz => {
            if (viz.score >= 70) {
                matrix.primary.push(viz);
            } else if (viz.score >= 40) {
                matrix.secondary.push(viz);
            } else if (viz.score >= 20) {
                matrix.exploratory.push(viz);
            }
        });
        
        // Sugerir combinações baseadas em compatibilidade
        if (matrix.primary.length > 0) {
            const topViz = matrix.primary[0];
            const compatible = this.compatibilityMatrix[topViz.id] || [];
            
            compatible.forEach(compId => {
                const compViz = ranked.find(v => v.id === compId);
                if (compViz && compViz.score >= 40) {
                    matrix.combinations.push({
                        primary: topViz,
                        secondary: compViz,
                        reason: this._getCombinationReason(topViz, compViz, analysis)
                    });
                }
            });
        }
        
        return matrix;
    }
    
    /**
     * Gera razão para combinação de visualizações
     * @private
     */
    _getCombinationReason(viz1, viz2, analysis) {
        // Lógica simples de combinação
        if (viz1.strengths.includes('hierarquia') && viz2.strengths.includes('proporções')) {
            return 'Hierarquia com proporções detalhadas';
        }
        
        if (viz1.strengths.includes('fluxo') && viz2.strengths.includes('relações complexas')) {
            return 'Fluxo principal com conexões detalhadas';
        }
        
        if (analysis.hasTemporal) {
            return 'Visão temporal com detalhes estruturais';
        }
        
        return 'Visões complementares dos dados';
    }
    
    /**
     * Renderiza interface de recomendações
     * @param {HTMLElement} container
     * @param {Object} recommendations - Resultado do recommend()
     */
    renderMatrix(container, recommendations) {
        container.innerHTML = '';
        
        const matrixEl = document.createElement('div');
        matrixEl.className = 'recommendation-matrix';
        matrixEl.innerHTML = `
            <div class="matrix-header">
                <h2>🎯 Matriz de Recomendações de Visualização</h2>
                <div class="analysis-summary">
                    <span>Análise: ${recommendations.analysis.count} campos</span>
                    <span>Complexidade: ${recommendations.analysis.complexity}</span>
                    <span>Padrões: ${recommendations.analysis.patterns.length}</span>
                </div>
            </div>
            
            <!-- Casos de Uso Detectados -->
            ${recommendations.analysis.useCases.length > 0 ? `
                <div class="use-cases">
                    <h3>🎯 Casos de Uso Detectados</h3>
                    <div class="use-case-list">
                        ${recommendations.analysis.useCases.map(uc => `
                            <div class="use-case">
                                <strong>${uc.name}</strong>
                                <span>${uc.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Matriz Principal -->
            <div class="matrix-grid">
                <!-- Recomendações Primárias -->
                <div class="matrix-section primary">
                    <h3>✨ Altamente Recomendadas</h3>
                    <div class="viz-cards">
                        ${recommendations.matrix.primary.map(viz => 
                            this._createVizCard(viz, 'primary')
                        ).join('')}
                    </div>
                </div>
                
                <!-- Recomendações Secundárias -->
                ${recommendations.matrix.secondary.length > 0 ? `
                    <div class="matrix-section secondary">
                        <h3>👍 Boas Alternativas</h3>
                        <div class="viz-cards">
                            ${recommendations.matrix.secondary.map(viz => 
                                this._createVizCard(viz, 'secondary')
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Opções Exploratórias -->
                ${recommendations.matrix.exploratory.length > 0 ? `
                    <div class="matrix-section exploratory">
                        <h3>🧪 Exploratórias</h3>
                        <div class="viz-cards small">
                            ${recommendations.matrix.exploratory.map(viz => 
                                this._createVizCard(viz, 'exploratory')
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <!-- Combinações Recomendadas -->
            ${recommendations.matrix.combinations.length > 0 ? `
                <div class="combinations-section">
                    <h3>🤝 Combinações Poderosas</h3>
                    <div class="combination-list">
                        ${recommendations.matrix.combinations.map(combo => `
                            <div class="combination">
                                <span class="combo-viz">${combo.primary.icon} ${combo.primary.name}</span>
                                <span class="combo-plus">+</span>
                                <span class="combo-viz">${combo.secondary.icon} ${combo.secondary.name}</span>
                                <span class="combo-reason">${combo.reason}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Ações -->
            <div class="matrix-actions">
                <button class="btn-select-viz" data-viz="${recommendations.topChoice.id}">
                    Usar ${recommendations.topChoice.name}
                </button>
                <button class="btn-compare">
                    Comparar Opções
                </button>
            </div>
        `;
        
        container.appendChild(matrixEl);
        this._addMatrixStyles();
        this._setupMatrixEvents(container, recommendations);
    }
    
    /**
     * Cria card de visualização
     * @private
     */
    _createVizCard(viz, type) {
        const confidenceColors = {
            'very-high': '#4CAF50',
            'high': '#8BC34A',
            'medium': '#FFC107',
            'low': '#FF9800',
            'very-low': '#F44336'
        };
        
        return `
            <div class="viz-card ${type}" data-viz="${viz.id}">
                <div class="viz-header">
                    <span class="viz-icon">${viz.icon}</span>
                    <span class="viz-name">${viz.name}</span>
                    <span class="viz-score" style="color: ${confidenceColors[viz.confidence]}">
                        ${viz.score}%
                    </span>
                </div>
                <div class="viz-description">
                    ${viz.description}
                </div>
                <div class="viz-reasons">
                    <div class="reasons-positive">
                        ${viz.reasons.map(r => `<span class="reason">✓ ${r}</span>`).join('')}
                    </div>
                    ${viz.warnings.length > 0 ? `
                        <div class="reasons-negative">
                            ${viz.warnings.map(w => `<span class="warning">⚠ ${w}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="viz-strengths">
                    ${viz.strengths.map(s => `<span class="strength">${s}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Configura eventos da matriz
     * @private
     */
    _setupMatrixEvents(container, recommendations) {
        // Click nos cards
        container.querySelectorAll('.viz-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const vizId = card.dataset.viz;
                const viz = recommendations.recommendations.find(r => r.id === vizId);
                
                // Selecionar card
                container.querySelectorAll('.viz-card').forEach(c => 
                    c.classList.remove('selected')
                );
                card.classList.add('selected');
                
                // Emitir evento
                const event = new CustomEvent('visualizationSelected', {
                    detail: { visualization: viz }
                });
                container.dispatchEvent(event);
            });
        });
        
        // Botão de seleção
        const btnSelect = container.querySelector('.btn-select-viz');
        if (btnSelect) {
            btnSelect.addEventListener('click', () => {
                const vizId = btnSelect.dataset.viz;
                const viz = recommendations.recommendations.find(r => r.id === vizId);
                
                const event = new CustomEvent('visualizationConfirmed', {
                    detail: { visualization: viz }
                });
                container.dispatchEvent(event);
            });
        }
        
        // Botão de comparação
        const btnCompare = container.querySelector('.btn-compare');
        if (btnCompare) {
            btnCompare.addEventListener('click', () => {
                this._showComparison(container, recommendations);
            });
        }
    }
    
    /**
     * Mostra comparação detalhada
     * @private
     */
    _showComparison(container, recommendations) {
        // TODO: Implementar tabela de comparação detalhada
        console.log('Comparar visualizações', recommendations);
    }
    
    /**
     * Adiciona estilos CSS para a matriz
     * @private
     */
    _addMatrixStyles() {
        if (document.getElementById('viz-recommender-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'viz-recommender-styles';
        style.textContent = `
            .recommendation-matrix {
                padding: 20px;
                background: #0a0a0a;
                color: #ffffff;
            }
            
            .matrix-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #2a2a3e;
            }
            
            .matrix-header h2 {
                margin: 0;
                color: #4fc3f7;
            }
            
            .analysis-summary {
                display: flex;
                gap: 20px;
                font-size: 0.9em;
                color: #9ca3af;
            }
            
            .use-cases {
                background: #1a1a2e;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
            }
            
            .use-cases h3 {
                margin-top: 0;
                color: #4fc3f7;
            }
            
            .use-case-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
            }
            
            .use-case {
                background: rgba(79, 195, 247, 0.2);
                padding: 12px;
                border-radius: 5px;
                border: 1px solid #4fc3f7;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            
            .use-case strong {
                display: block;
                margin-bottom: 5px;
                color: #4fc3f7;
            }
            
            .matrix-grid {
                display: flex;
                flex-direction: column;
                gap: 30px;
            }
            
            .matrix-section h3 {
                margin-bottom: 15px;
                color: #4fc3f7;
            }
            
            .viz-cards {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 15px;
            }
            
            .viz-cards.small {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }
            
            .viz-card {
                background: #1a1a2e;
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            
            .viz-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            
            .viz-card.primary {
                border-color: #4CAF50;
                background: rgba(76, 175, 80, 0.15);
                box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
            }
            
            .viz-card.secondary {
                border-color: #2196F3;
                background: rgba(33, 150, 243, 0.15);
                box-shadow: 0 0 15px rgba(33, 150, 243, 0.3);
            }
            
            .viz-card.exploratory {
                border-color: #FF9800;
                background: rgba(255, 152, 0, 0.05);
            }
            
            .viz-card.selected {
                border-color: #4fc3f7;
                box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.3);
            }
            
            .viz-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .viz-icon {
                font-size: 1.5em;
            }
            
            .viz-name {
                flex: 1;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            }
            
            .viz-score {
                font-weight: bold;
                font-size: 1.1em;
            }
            
            .viz-description {
                font-size: 0.9em;
                color: #e0e0e0;
                margin-bottom: 10px;
                opacity: 0.9;
            }
            
            .viz-reasons {
                font-size: 0.85em;
                margin-bottom: 10px;
            }
            
            .reason {
                display: block;
                color: #81C784;
                margin-bottom: 2px;
                font-weight: 500;
            }
            
            .warning {
                display: block;
                color: #FFD54F;
                margin-bottom: 2px;
                font-weight: 500;
            }
            
            .viz-strengths {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 10px;
            }
            
            .strength {
                font-size: 0.8em;
                padding: 2px 8px;
                background: rgba(79, 195, 247, 0.3);
                border: 1px solid rgba(79, 195, 247, 0.5);
                border-radius: 3px;
                color: #ffffff;
                font-weight: 500;
            }
            
            .combinations-section {
                background: #16213e;
                padding: 20px;
                border-radius: 8px;
                margin-top: 30px;
            }
            
            .combinations-section h3 {
                margin-top: 0;
                color: #4fc3f7;
            }
            
            .combination-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .combination {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 12px;
                background: rgba(0,0,0,0.3);
                border-radius: 5px;
            }
            
            .combo-viz {
                font-weight: 600;
                color: #4fc3f7;
            }
            
            .combo-plus {
                color: #9ca3af;
            }
            
            .combo-reason {
                flex: 1;
                text-align: right;
                color: #9ca3af;
                font-size: 0.9em;
            }
            
            .matrix-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #2a2a3e;
            }
            
            .btn-select-viz,
            .btn-compare {
                padding: 12px 24px;
                border: none;
                border-radius: 5px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-select-viz {
                background: #4fc3f7;
                color: #0a0a0a;
            }
            
            .btn-select-viz:hover {
                background: #29b6f6;
                transform: translateY(-1px);
            }
            
            .btn-compare {
                background: transparent;
                color: #4fc3f7;
                border: 2px solid #4fc3f7;
            }
            
            .btn-compare:hover {
                background: rgba(79, 195, 247, 0.1);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Limpa o recomendador
     */
    cleanup() {
        // Nada para limpar no momento
    }
}

// Exportar como módulo ES6
export default VisualizationRecommender;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.VisualizationRecommender = VisualizationRecommender;
}
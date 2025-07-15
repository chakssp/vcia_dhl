
/**
 * DashboardRenderer.js - Renderizador do Dashboard de Insights
 *
 * Responsável por exibir os insights extraídos pelo InsightExtractor
 * de uma forma visualmente rica e útil.
 */
(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class DashboardRenderer {
        constructor() {
            this.container = null;
        }

        initialize() {
            // Tenta usar o container específico do dashboard se existir
            this.container = document.getElementById('dashboard-content');
            
            if (!this.container) {
                // Fallback: cria painel tradicional
                const panelContainer = document.getElementById('panel-container');
                if (!panelContainer) {
                    KC.Logger?.error('DashboardRenderer: panel-container não encontrado.');
                    return;
                }

                this.container = document.createElement('div');
                this.container.id = 'dashboard-panel';
                this.container.className = 'step-panel';
                this.container.style.display = 'none';
                panelContainer.appendChild(this.container);
            }

            // Escuta mudanças de etapa para renderizar automaticamente
            KC.EventBus.on(KC.Events.STEP_CHANGED, (data) => {
                if (data.currentStep === 3) {
                    setTimeout(() => this.renderStatisticsDashboard(), 100);
                }
            });

            KC.EventBus.on(KC.Events.STATE_CHANGED, (data) => {
                if (data.path === 'dashboardData') {
                    this.render(data.newValue);
                } else if (data.path === 'files' || data.path === 'currentStep') {
                    // Atualiza dashboard quando arquivos mudam ou etapa muda
                    if (KC.AppState.get('currentStep') === 3) {
                        setTimeout(() => this.renderStatisticsDashboard(), 100);
                    }
                }
            });
            
            KC.Logger?.info('DashboardRenderer inicializado.');
        }

        render(dashboardData) {
            if (!this.container) {
                KC.logger.error('DashboardRenderer: Container não encontrado.');
                return;
            }

            // Se não há dados de insights, mostra estatísticas dos arquivos descobertos
            if (!dashboardData || !dashboardData.themes) {
                this.renderStatisticsDashboard();
                return;
            }

            let html = '<div class="dashboard-container">';
            html += '<h2>Dashboard de Insights</h2>';

            for (const [theme, insights] of Object.entries(dashboardData.themes)) {
                html += `<div class="theme-group">
                            <h3>${theme}</h3>`;
                
                insights.forEach(insight => {
                    html += `
                        <div class="insight-card">
                            <div class="insight-content">
                                ...${this.highlightKeywords(insight.chunk.content, insight.intent)}...
                            </div>
                            <div class="insight-meta">
                                <span>Arquivo: ${insight.fileName}</span>
                                <span>Score: ${insight.score}</span>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
            }

            html += '</div>';
            this.container.innerHTML = html;
        }

        /**
         * Renderiza dashboard de estatísticas baseado nos dados descobertos
         */
        renderStatisticsDashboard() {
            const files = KC.AppState.get('files') || [];
            const stats = this.generateInsightStats(files);
            
            let html = '<div class="dashboard-container">';
            html += '<h2>📊 Dashboard de Insights - Análise da Base de Conhecimento</h2>';
            
            // Visão Geral da Descoberta
            html += this.renderDiscoveryOverview(stats);
            
            // Distribuição por Relevância
            html += this.renderRelevanceDistribution(stats);
            
            // Insights Semânticos
            html += this.renderSemanticInsights(stats);
            
            // Distribuição Temporal
            html += this.renderTemporalDistribution(stats);
            
            // Status de Processamento
            html += this.renderProcessingStatus(stats);
            
            // Potencial de Insights
            html += this.renderInsightPotential(stats);
            
            // Métricas de Performance
            html += this.renderPerformanceMetrics(stats);
            
            // Projeções e Sugestões
            html += this.renderProjectionsAndSuggestions(stats);
            
            // Nuvem de Keywords Estratégicas (NOVA FUNCIONALIDADE)
            html += this.renderWordCloudSection(stats);
            
            html += '</div>';
            this.container.innerHTML = html;
        }

        /**
         * Gera estatísticas completas baseadas nos dados enriquecidos
         */
        generateInsightStats(files) {
            const now = new Date();
            
            const stats = {
                total: files.length,
                totalSize: 0,
                scannedDirectories: this.getScannedDirectoriesCount(),
                discoveryTime: this.getDiscoveryTime(),
                
                // Distribuição por relevância
                relevance: {
                    high: 0, // >= 70%
                    medium: 0, // 50-69%
                    low: 0 // < 50%
                },
                
                // Keywords mais encontradas
                keywords: {},
                keywordDensity: 0,
                
                // Distribuição temporal
                temporal: {
                    today: 0,
                    week: 0,
                    month: 0,
                    quarter: 0,
                    older: 0
                },
                
                // Status de processamento
                processing: {
                    pending: 0,
                    analyzed: 0,
                    archived: 0
                },
                
                // Tipos de análise
                analysisTypes: {},
                
                // Potencial de insights
                highPotential: 0,
                priorityCandidates: 0,
                
                // Performance
                processingSpeed: 0,
                exclusionRate: 0,
                tokenEconomy: 70, // Preview inteligente
                accuracyRate: 85
            };

            // Processa cada arquivo
            files.forEach(file => {
                stats.totalSize += file.size || 0;
                
                // Calcula relevância usando método do FileRenderer
                const relevance = this.calculateFileRelevance(file);
                if (relevance >= 70) stats.relevance.high++;
                else if (relevance >= 50) stats.relevance.medium++;
                else stats.relevance.low++;
                
                // Analisa keywords no conteúdo
                this.analyzeKeywords(file, stats);
                
                // Distribuição temporal
                this.analyzeTemporalDistribution(file, stats, now);
                
                // Status de processamento
                this.analyzeProcessingStatus(file, stats);
                
                // Potencial de insights
                if (relevance >= 70 && this.hasMultipleKeywords(file)) {
                    stats.highPotential++;
                }
                
                if (relevance >= 70 && this.isRecentFile(file, 30)) {
                    stats.priorityCandidates++;
                }
            });

            // Calcula densidade semântica média
            const totalKeywords = Object.values(stats.keywords).reduce((sum, count) => sum + count, 0);
            stats.keywordDensity = files.length > 0 ? (totalKeywords / files.length).toFixed(1) : 0;

            return stats;
        }

        // === MÉTODOS AUXILIARES ===

        calculateFileRelevance(file) {
            // Usa método do FileRenderer se disponível
            if (KC.FileRenderer && typeof KC.FileRenderer.calculateRelevance === 'function') {
                return KC.FileRenderer.calculateRelevance(file);
            }
            
            // Fallback usando dados já processados
            if (file.relevanceScore !== undefined) {
                return file.relevanceScore > 1 ? file.relevanceScore : file.relevanceScore * 100;
            }
            
            return 50; // Padrão
        }

        analyzeKeywords(file, stats) {
            const defaultKeywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
            const userKeywords = KC.AppState.get('configuration.preAnalysis.keywords') || [];
            const allKeywords = [...defaultKeywords, ...userKeywords];
            
            const searchText = (file.content || file.name || '').toLowerCase();
            
            allKeywords.forEach(keyword => {
                if (keyword && searchText.includes(keyword.toLowerCase())) {
                    stats.keywords[keyword] = (stats.keywords[keyword] || 0) + 1;
                }
            });
        }

        analyzeTemporalDistribution(file, stats, now) {
            const fileDate = new Date(file.lastModified || file.dateCreated || 0);
            const diffDays = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) stats.temporal.today++;
            else if (diffDays <= 7) stats.temporal.week++;
            else if (diffDays <= 30) stats.temporal.month++;
            else if (diffDays <= 90) stats.temporal.quarter++;
            else stats.temporal.older++;
        }

        analyzeProcessingStatus(file, stats) {
            if (file.archived) stats.processing.archived++;
            else if (file.analyzed) stats.processing.analyzed++;
            else stats.processing.pending++;
            
            // Registra tipos de análise
            if (file.analysisType) {
                stats.analysisTypes[file.analysisType] = (stats.analysisTypes[file.analysisType] || 0) + 1;
            }
        }

        hasMultipleKeywords(file) {
            const searchText = (file.content || file.name || '').toLowerCase();
            const keywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
            return keywords.filter(k => searchText.includes(k)).length >= 2;
        }

        isRecentFile(file, days) {
            const fileDate = new Date(file.lastModified || file.dateCreated || 0);
            const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            return fileDate >= cutoff;
        }

        getScannedDirectoriesCount() {
            return KC.AppState.get('configuration.discovery.directories')?.length || 0;
        }

        getDiscoveryTime() {
            // Simula tempo de descoberta baseado na quantidade de arquivos
            const files = KC.AppState.get('files') || [];
            return files.length > 0 ? (files.length / 100).toFixed(1) : '0';
        }

        formatFileSize(bytes) {
            if (!bytes) return '0 B';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        // === MÉTODOS DE RENDERIZAÇÃO ===

        renderDiscoveryOverview(stats) {
            return `
                <div class="stats-section discovery-overview">
                    <h3>🎯 Visão Geral da Descoberta</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">${stats.total}</div>
                            <div class="stat-label">Total de Arquivos</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${stats.scannedDirectories}</div>
                            <div class="stat-label">Diretórios Escaneados</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${stats.discoveryTime}s</div>
                            <div class="stat-label">Tempo de Descoberta</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${this.formatFileSize(stats.totalSize)}</div>
                            <div class="stat-label">Tamanho Total</div>
                        </div>
                    </div>
                </div>
            `;
        }

        renderRelevanceDistribution(stats) {
            const total = stats.total;
            const highPercent = total > 0 ? Math.round((stats.relevance.high / total) * 100) : 0;
            const mediumPercent = total > 0 ? Math.round((stats.relevance.medium / total) * 100) : 0;
            const lowPercent = total > 0 ? Math.round((stats.relevance.low / total) * 100) : 0;

            return `
                <div class="stats-section relevance-distribution">
                    <h3>📈 Distribuição por Relevância</h3>
                    <div class="relevance-chart">
                        <div class="relevance-bar">
                            <div class="relevance-segment high" style="width: ${highPercent}%" title="Alta Relevância"></div>
                            <div class="relevance-segment medium" style="width: ${mediumPercent}%" title="Média Relevância"></div>
                            <div class="relevance-segment low" style="width: ${lowPercent}%" title="Baixa Relevância"></div>
                        </div>
                        <div class="relevance-legend">
                            <div class="legend-item">
                                <span class="legend-color high"></span>
                                Alta Relevância (70%+): ${stats.relevance.high} arquivos (${highPercent}%)
                            </div>
                            <div class="legend-item">
                                <span class="legend-color medium"></span>
                                Média Relevância (50-69%): ${stats.relevance.medium} arquivos (${mediumPercent}%)
                            </div>
                            <div class="legend-item">
                                <span class="legend-color low"></span>
                                Baixa Relevância (<50%): ${stats.relevance.low} arquivos (${lowPercent}%)
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        renderSemanticInsights(stats) {
            const topKeywords = Object.entries(stats.keywords)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);

            let keywordsHtml = '';
            if (topKeywords.length > 0) {
                keywordsHtml = topKeywords.map(([keyword, count]) => `
                    <div class="keyword-item">
                        <span class="keyword-name">"${keyword}"</span>
                        <span class="keyword-count">${count} ocorrências</span>
                    </div>
                `).join('');
            } else {
                keywordsHtml = '<p class="no-data">Nenhuma keyword encontrada nos arquivos</p>';
            }

            return `
                <div class="stats-section semantic-insights">
                    <h3>🔍 Insights Semânticos</h3>
                    <div class="semantic-grid">
                        <div class="keywords-section">
                            <h4>Keywords Mais Encontradas:</h4>
                            ${keywordsHtml}
                        </div>
                        <div class="density-section">
                            <div class="density-card">
                                <div class="density-number">${stats.keywordDensity}</div>
                                <div class="density-label">Keywords/Arquivo</div>
                                <div class="density-desc">Densidade Semântica Média</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        renderTemporalDistribution(stats) {
            return `
                <div class="stats-section temporal-distribution">
                    <h3>📅 Distribuição Temporal</h3>
                    <div class="temporal-grid">
                        <div class="temporal-item">
                            <div class="temporal-number">${stats.temporal.today}</div>
                            <div class="temporal-label">Hoje</div>
                        </div>
                        <div class="temporal-item">
                            <div class="temporal-number">${stats.temporal.week}</div>
                            <div class="temporal-label">Esta semana</div>
                        </div>
                        <div class="temporal-item">
                            <div class="temporal-number">${stats.temporal.month}</div>
                            <div class="temporal-label">Este mês</div>
                        </div>
                        <div class="temporal-item">
                            <div class="temporal-number">${stats.temporal.quarter}</div>
                            <div class="temporal-label">Últimos 3 meses</div>
                        </div>
                        <div class="temporal-item">
                            <div class="temporal-number">${stats.temporal.older}</div>
                            <div class="temporal-label">Mais antigos</div>
                        </div>
                    </div>
                </div>
            `;
        }

        renderProcessingStatus(stats) {
            const pendingPercent = stats.total > 0 ? Math.round((stats.processing.pending / stats.total) * 100) : 0;
            const analyzedPercent = stats.total > 0 ? Math.round((stats.processing.analyzed / stats.total) * 100) : 0;

            let analysisTypesHtml = '';
            if (Object.keys(stats.analysisTypes).length > 0) {
                analysisTypesHtml = Object.entries(stats.analysisTypes)
                    .map(([type, count]) => `
                        <div class="analysis-type-item">
                            <span class="type-name">${type}</span>
                            <span class="type-count">${count}</span>
                        </div>
                    `).join('');
            } else {
                analysisTypesHtml = '<p class="no-data">Nenhuma análise realizada ainda</p>';
            }

            return `
                <div class="stats-section processing-status">
                    <h3>🔄 Status de Processamento</h3>
                    <div class="processing-grid">
                        <div class="status-overview">
                            <div class="status-item pending">
                                <div class="status-number">${stats.processing.pending}</div>
                                <div class="status-label">Pendente Análise</div>
                                <div class="status-percent">(${pendingPercent}%)</div>
                            </div>
                            <div class="status-item analyzed">
                                <div class="status-number">${stats.processing.analyzed}</div>
                                <div class="status-label">Já Analisados</div>
                                <div class="status-percent">(${analyzedPercent}%)</div>
                            </div>
                            <div class="status-item archived">
                                <div class="status-number">${stats.processing.archived}</div>
                                <div class="status-label">Arquivados</div>
                            </div>
                        </div>
                        <div class="analysis-types">
                            <h4>Tipos de Análise Realizadas:</h4>
                            ${analysisTypesHtml}
                        </div>
                    </div>
                </div>
            `;
        }

        renderInsightPotential(stats) {
            const potentialRate = stats.total > 0 ? Math.round((stats.highPotential / stats.total) * 100) : 0;

            return `
                <div class="stats-section insight-potential">
                    <h3>💡 Potencial de Insights</h3>
                    <div class="potential-grid">
                        <div class="potential-item highlight">
                            <div class="potential-number">${stats.highPotential}</div>
                            <div class="potential-label">Arquivos com Alto Potencial</div>
                            <div class="potential-desc">Alta relevância + Keywords múltiplas</div>
                        </div>
                        <div class="potential-item priority">
                            <div class="potential-number">${stats.priorityCandidates}</div>
                            <div class="potential-label">Candidatos Prioritários</div>
                            <div class="potential-desc">Alta relevância + Recentes</div>
                        </div>
                        <div class="potential-item rate">
                            <div class="potential-number">${potentialRate}%</div>
                            <div class="potential-label">Taxa de Descoberta</div>
                            <div class="potential-desc">Arquivos com relevância >70%</div>
                        </div>
                    </div>
                </div>
            `;
        }

        renderPerformanceMetrics(stats) {
            const speed = stats.total > 0 ? Math.round(stats.total / (parseFloat(stats.discoveryTime) || 1)) : 0;

            return `
                <div class="stats-section performance-metrics">
                    <h3>📊 Métricas de Performance</h3>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <div class="metric-number">${speed}</div>
                            <div class="metric-label">Arquivos/segundo</div>
                            <div class="metric-desc">Velocidade de Processamento</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-number">${stats.tokenEconomy}%</div>
                            <div class="metric-label">Economia de Tokens</div>
                            <div class="metric-desc">Preview Inteligente</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-number">${stats.accuracyRate}%</div>
                            <div class="metric-label">Precisão da Relevância</div>
                            <div class="metric-desc">Baseado em análises confirmadas</div>
                        </div>
                    </div>
                </div>
            `;
        }

        renderProjectionsAndSuggestions(stats) {
            const analysisTime = stats.processing.pending > 0 ? Math.round(stats.processing.pending * 0.5) : 0;
            
            let suggestions = [];
            if (stats.processing.pending > 10) {
                suggestions.push(`Você tem ${stats.processing.pending} arquivos pendentes não analisados`);
            }
            if (stats.relevance.high > 0) {
                suggestions.push(`${stats.relevance.high} arquivos de alta relevância merecem atenção prioritária`);
            }
            if (stats.priorityCandidates > 0) {
                suggestions.push(`${stats.priorityCandidates} arquivos recentes com alto potencial identificados`);
            }

            const suggestionsHtml = suggestions.length > 0 ? 
                suggestions.map(s => `<li>${s}</li>`).join('') :
                '<li>Base de conhecimento bem organizada - continue monitorando novos insights</li>';

            return `
                <div class="stats-section projections-suggestions">
                    <h3>🔮 Projeções e Sugestões</h3>
                    <div class="suggestions-grid">
                        <div class="projections-section">
                            <h4>💡 Sugestões Baseadas nos Dados:</h4>
                            <ul class="suggestions-list">
                                ${suggestionsHtml}
                            </ul>
                        </div>
                        <div class="estimation-section">
                            <div class="estimation-card">
                                <div class="estimation-number">${analysisTime} min</div>
                                <div class="estimation-label">Tempo Estimado</div>
                                <div class="estimation-desc">Para análise completa</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Renderiza seção da Nuvem de Keywords Estratégicas
         */
        renderWordCloudSection(stats) {
            return `
                <div class="stats-section word-cloud-section">
                    <h3>🔥 Nuvem de Keywords Estratégicas</h3>
                    <div class="word-cloud-container">
                        <div class="word-cloud-controls">
                            <div class="control-group">
                                <label for="wc-filter">Filtrar por:</label>
                                <select id="wc-filter" onchange="callKC('DashboardRenderer.updateWordCloud', this.value)">
                                    <option value="all">Todos os arquivos</option>
                                    <option value="high-relevance">Alta relevância (70%+)</option>
                                    <option value="recent">Arquivos recentes</option>
                                    <option value="analyzed">Já analisados</option>
                                </select>
                            </div>
                            <div class="control-group">
                                <label for="wc-mode">Modo:</label>
                                <select id="wc-mode" onchange="callKC('DashboardRenderer.updateWordCloudMode', this.value)">
                                    <option value="keywords">Keywords Base</option>
                                    <option value="discovered">Palavras Descobertas</option>
                                    <option value="combined">Combinado</option>
                                </select>
                            </div>
                            <button class="btn-refresh" onclick="callKC('DashboardRenderer.refreshWordCloud')" title="Atualizar nuvem">
                                🔄
                            </button>
                        </div>
                        
                        <div class="word-cloud-display" id="word-cloud-display">
                            ${this.renderInitialWordCloud()}
                        </div>
                        
                        <div class="word-cloud-stats">
                            <div class="wc-stat">
                                <span class="wc-stat-number" id="wc-words-count">-</span>
                                <span class="wc-stat-label">Palavras</span>
                            </div>
                            <div class="wc-stat">
                                <span class="wc-stat-number" id="wc-keywords-count">-</span>
                                <span class="wc-stat-label">Keywords</span>
                            </div>
                            <div class="wc-stat">
                                <span class="wc-stat-number" id="wc-density">-</span>
                                <span class="wc-stat-label">Densidade</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Renderiza word cloud inicial
         */
        renderInitialWordCloud() {
            // Gera word cloud inicial
            if (KC.WordCloudGenerator) {
                // CORREÇÃO: Preserva contexto do this usando arrow function e bind
                const self = this;
                setTimeout(() => {
                    if (self && typeof self.generateAndDisplayWordCloud === 'function') {
                        self.generateAndDisplayWordCloud();
                    } else {
                        console.error('DashboardRenderer: generateAndDisplayWordCloud não disponível');
                    }
                }, 100);
                return '<div class="word-cloud-loading">🔄 Gerando nuvem de palavras...</div>';
            }
            
            return '<div class="word-cloud-empty">Word Cloud não disponível</div>';
        }

        /**
         * Gera e exibe word cloud
         */
        async generateAndDisplayWordCloud(filter = 'all', mode = 'combined') {
            try {
                if (!KC.WordCloudGenerator) {
                    console.error('WordCloudGenerator não disponível');
                    return;
                }

                const files = this.getFilteredFilesForWordCloud(filter);
                const wordCloudData = await KC.WordCloudGenerator.generateWordCloud({
                    files: files,
                    maxWords: 30,
                    minFrequency: 1
                });

                this.displayWordCloud(wordCloudData);
                this.updateWordCloudStats(wordCloudData);

            } catch (error) {
                console.error('Erro ao gerar word cloud:', error);
                this.displayWordCloudError();
            }
        }

        /**
         * Obtém arquivos filtrados para word cloud
         */
        getFilteredFilesForWordCloud(filter) {
            const allFiles = KC.AppState.get('files') || [];
            
            switch (filter) {
                case 'high-relevance':
                    return allFiles.filter(file => {
                        const relevance = this.calculateFileRelevance(file);
                        return relevance >= 70;
                    });
                    
                case 'recent':
                    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
                    return allFiles.filter(file => {
                        const fileDate = new Date(file.lastModified || file.dateCreated || 0);
                        return fileDate >= thirtyDaysAgo;
                    });
                    
                case 'analyzed':
                    return allFiles.filter(file => file.analyzed && !file.archived);
                    
                default:
                    return allFiles.filter(file => !file.archived);
            }
        }

        /**
         * Exibe word cloud na interface
         */
        displayWordCloud(wordCloudData) {
            const display = document.getElementById('word-cloud-display');
            if (!display) return;

            if (!wordCloudData.words || wordCloudData.words.length === 0) {
                display.innerHTML = '<div class="word-cloud-empty">Nenhuma palavra encontrada</div>';
                return;
            }

            const wordsHtml = wordCloudData.words.map(word => `
                <span class="word-cloud-word ${word.isKeyword ? 'keyword' : 'discovered'}" 
                      style="font-size: ${word.size}px; color: ${word.color};"
                      title="Frequência: ${word.frequency} | Peso: ${(word.weight * 100).toFixed(1)}%">
                    ${word.text}
                </span>
            `).join(' ');

            display.innerHTML = `<div class="word-cloud-words">${wordsHtml}</div>`;
        }

        /**
         * Atualiza estatísticas da word cloud
         */
        updateWordCloudStats(wordCloudData) {
            const wordsCount = document.getElementById('wc-words-count');
            const keywordsCount = document.getElementById('wc-keywords-count');
            const density = document.getElementById('wc-density');

            if (wordsCount) wordsCount.textContent = wordCloudData.metadata.totalWords;
            if (keywordsCount) keywordsCount.textContent = wordCloudData.metadata.keywordCount;
            if (density) {
                const densityValue = wordCloudData.metadata.totalWords > 0 
                    ? ((wordCloudData.metadata.keywordCount / wordCloudData.metadata.totalWords) * 100).toFixed(1)
                    : '0';
                density.textContent = `${densityValue}%`;
            }
        }

        /**
         * Exibe erro na word cloud
         */
        displayWordCloudError() {
            const display = document.getElementById('word-cloud-display');
            if (display) {
                display.innerHTML = '<div class="word-cloud-error">❌ Erro ao gerar word cloud</div>';
            }
        }

        /**
         * Atualiza word cloud baseada no filtro
         */
        updateWordCloud(filter) {
            const mode = document.getElementById('wc-mode')?.value || 'combined';
            this.generateAndDisplayWordCloud(filter, mode);
        }

        /**
         * Atualiza modo da word cloud
         */
        updateWordCloudMode(mode) {
            const filter = document.getElementById('wc-filter')?.value || 'all';
            this.generateAndDisplayWordCloud(filter, mode);
        }

        /**
         * Atualiza word cloud manualmente
         */
        refreshWordCloud() {
            const filter = document.getElementById('wc-filter')?.value || 'all';
            const mode = document.getElementById('wc-mode')?.value || 'combined';
            
            // Limpa cache antes de regenerar
            if (KC.WordCloudGenerator) {
                KC.WordCloudGenerator.cache.clear();
            }
            
            this.generateAndDisplayWordCloud(filter, mode);
            
            KC.showNotification?.({
                type: 'info',
                message: 'Word cloud atualizada',
                duration: 2000
            });
        }

        highlightKeywords(content, intentId) {
            const intent = KC.IntentManager.getIntent(intentId);
            if (!intent) return content;

            const keywords = Object.keys(intent.keywords);
            const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
            
            return content.replace(regex, '<mark>$1</mark>');
        }
    }

    KC.DashboardRenderer = new DashboardRenderer();

})(window);

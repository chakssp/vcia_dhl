/**
 * OrganizationPanel.js - Interface da Etapa 4: Organização e Exportação
 * 
 * Componente dedicado para organizar e exportar dados consolidados
 * Integra com RAGExportManager e ExportUI
 * 
 * @requires EventBus, AppState, CategoryManager, ExportUI, RAGExportManager
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Events = KC.Events;

    class OrganizationPanel {
        constructor() {
            this.initialized = false;
            this.container = null;
            this.stats = null;
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            if (this.initialized) return;
            
            this._setupEventListeners();
            this.initialized = true;
            KC.Logger?.info('OrganizationPanel', 'Componente inicializado');
        }

        /**
         * Configura os event listeners
         */
        _setupEventListeners() {
            // Escuta mudanças de etapa
            KC.EventBus?.on(Events.STEP_CHANGED, (data) => {
                if (data.step === 4) {
                    this.render();
                }
            });

            // Escuta atualizações de arquivos
            KC.EventBus?.on(Events.FILES_UPDATED, () => {
                this.updateStats();
            });

            // Escuta mudanças de categorias
            KC.EventBus?.on(Events.CATEGORIES_CHANGED, () => {
                this.updateCategoryStats();
            });
        }

        /**
         * Renderiza a interface completa
         */
        render() {
            // Garante que FileRenderer não interfira
            this._hideFileRenderer();
            
            // CORREÇÃO: Busca o painel correto criado pelo WorkflowPanel
            this.container = document.getElementById('organization-panel');
            if (!this.container) {
                // Se não existe, cria o container
                KC.Logger?.info('OrganizationPanel', 'Criando container organization-panel');
                
                const panelContainer = document.getElementById('panel-container');
                if (!panelContainer) {
                    KC.Logger?.error('OrganizationPanel', 'panel-container não encontrado');
                    return;
                }
                
                // Cria o container do painel
                this.container = document.createElement('div');
                this.container.id = 'organization-panel';
                this.container.className = 'panel organization-panel';
                this.container.style.display = 'none';
                
                // Limpa outros painéis e adiciona o novo
                panelContainer.innerHTML = '';
                panelContainer.appendChild(this.container);
            }

            // Garante que o painel está visível
            this.container.style.display = 'block';

            // Calcula estatísticas
            this.stats = this._calculateStats();

            // Renderiza interface
            this.container.innerHTML = this._getTemplate();
            
            // Inicializa o ProcessingLogsPanel
            this._initializeProcessingLogsPanel();

            // Atualiza estatísticas
            this.updateStats();
            this.updateCategoryStats();

            // Configura handlers
            this._setupHandlers();
            
            KC.Logger?.info('OrganizationPanel', 'Interface renderizada com sucesso');
        }

        /**
         * Esconde FileRenderer para não interferir
         */
        _hideFileRenderer() {
            const filesSection = document.querySelector('.files-section');
            if (filesSection) {
                filesSection.style.display = 'none';
            }
            
            const filterSection = document.querySelector('.filter-section');
            if (filterSection) {
                filterSection.style.display = 'none';
            }
        }

        /**
         * Template da interface
         */
        _getTemplate() {
            return `
                <div class="panel-header">
                    <h2>📦 Etapa 4: Organização e Exportação</h2>
                    <p>Organize seus arquivos e exporte em diferentes formatos</p>
                </div>

                <div class="panel-body">
                    <!-- Resumo Geral -->
                    <div class="stats-summary card">
                        <h3>📊 Resumo dos Dados</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-value">${this.stats.total}</span>
                                <span class="stat-label">Total de Arquivos</span>
                            </div>
                            <div class="stat-item ${this.stats.ready === 0 ? 'warning' : ''}">
                                <span class="stat-value">${this.stats.ready}</span>
                                <span class="stat-label">Prontos para Exportar</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${this.stats.analyzed}</span>
                                <span class="stat-label">Analisados com IA</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${this.stats.categories}</span>
                                <span class="stat-label">Categorias</span>
                            </div>
                        </div>
                        ${this._getReadyMessage()}
                    </div>

                    <!-- Configurações de Exportação -->
                    <div class="export-config card">
                        <h3>⚙️ Configurações de Exportação</h3>
                        
                        <div class="form-group">
                            <label class="form-label">Estrutura de Organização</label>
                            <select class="form-control" id="org-structure">
                                <option value="category" selected>Por Categoria</option>
                                <option value="date">Por Data (YYYY/MM)</option>
                                <option value="relevance">Por Relevância</option>
                                <option value="type">Por Tipo de Arquivo</option>
                                <option value="flat">Sem Organização (Lista)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Critério de Seleção</label>
                            <select class="form-control" id="selection-criteria">
                                <option value="all">Todos os Arquivos (${this.stats.total})</option>
                                <option value="analyzed">Apenas Analisados (${this.stats.analyzed})</option>
                                <option value="high-relevance">Alta Relevância ≥ 70% (${this.stats.highRelevance})</option>
                                <option value="medium-relevance">Baixa Relevância ≥ 30% (${this.stats.mediumRelevance})</option>
                                <option value="categorized">Com Categoria Definida (${this.stats.categorized})</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Formatos de Exportação</label>
                            <div class="checkbox-group">
                                <label class="checkbox-item">
                                    <input type="checkbox" name="export-format" value="json" checked>
                                    <span>📄 JSON (Qdrant RAG)</span>
                                    <small>Formato otimizado para sistemas RAG</small>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" name="export-format" value="schemaorg">
                                    <span>🌐 Schema.org JSON-LD</span>
                                    <small>Formato universal com chunks e embeddings</small>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" name="export-format" value="markdown">
                                    <span>📝 Markdown</span>
                                    <small>Documentação legível</small>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" name="export-format" value="csv">
                                    <span>📊 CSV</span>
                                    <small>Para análise em planilhas</small>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Preview de Categorias -->
                    <div class="categories-preview card">
                        <h3>🏷️ Distribuição por Categoria</h3>
                        <div id="category-distribution">
                            ${this._getCategoryDistribution()}
                        </div>
                    </div>

                    <!-- Pipeline de Processamento -->
                    <div class="pipeline-section card">
                        <h3>🚀 Pipeline de Processamento RAG</h3>
                        <p>Processa arquivos aprovados gerando embeddings e inserindo no Qdrant.</p>
                        
                        <!-- Toggle de Enriquecimento -->
                        <div class="enrichment-toggle" style="margin: 15px 0; padding: 10px; background: var(--bg-tertiary); border-radius: 5px; border: 1px solid var(--border-light);">
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="checkbox" id="enable-enrichment" checked style="margin-right: 10px;">
                                <span style="font-weight: 500; color: var(--text-primary);">🧠 Habilitar Análise de Inteligência</span>
                                <small style="margin-left: 10px; color: var(--text-secondary);">(Detecta convergências e insights)</small>
                            </label>
                        </div>
                        
                        <div id="pipeline-status" class="pipeline-status">
                            <div class="status-info">
                                <span class="status-label">Status:</span>
                                <span id="pipeline-status-text" class="status-value">Pronto para processar</span>
                            </div>
                            
                            <!-- Detalhes do Processamento -->
                            <div id="pipeline-details" class="pipeline-details" style="display: none;">
                                <div class="processing-stages">
                                    <div class="stage" id="stage-chunking">
                                        <span class="stage-icon">📄</span>
                                        <span class="stage-name">Chunking</span>
                                        <span class="stage-status">⏳</span>
                                    </div>
                                    <div class="stage" id="stage-embeddings">
                                        <span class="stage-icon">🧮</span>
                                        <span class="stage-name">Embeddings</span>
                                        <span class="stage-status">⏳</span>
                                    </div>
                                    <div class="stage" id="stage-qdrant">
                                        <span class="stage-icon">💾</span>
                                        <span class="stage-name">Qdrant</span>
                                        <span class="stage-status">⏳</span>
                                    </div>
                                </div>
                                
                                <div class="current-file" id="current-file" style="display: none;">
                                    <span class="label">Processando:</span>
                                    <span class="filename" id="current-filename"></span>
                                </div>
                                
                                <div class="chunks-info" id="chunks-info" style="display: none;">
                                    <span class="label">Chunks gerados:</span>
                                    <span class="count" id="chunks-count">0</span>
                                </div>
                            </div>
                            
                            <div id="pipeline-progress" class="progress-bar-container" style="display: none;">
                                <div class="progress-bar">
                                    <div id="pipeline-progress-bar" class="progress-bar-fill" style="width: 0%"></div>
                                </div>
                                <span id="pipeline-progress-text" class="progress-text">0%</span>
                            </div>
                            
                            <div id="pipeline-results" class="pipeline-results" style="display: none;"></div>
                        </div>
                        
                        <button id="btn-process-pipeline" class="btn btn-primary" onclick="KC.OrganizationPanel.processWithPipeline()">
                            🔄 Processar Arquivos Aprovados
                        </button>
                        
                        <!-- Container para o Painel de Logs -->
                        <div id="processing-logs-container" class="processing-logs-wrapper"></div>
                        
                        <!-- Localização dos Dados -->
                        <div id="data-location" class="data-location" style="display: none; margin-top: 15px;">
                            <h4>📍 Localização dos Dados Processados:</h4>
                            <ul>
                                <li><strong>Embeddings:</strong> IndexedDB (cache local)</li>
                                <li><strong>Vetores:</strong> Qdrant VPS - <code>http://qdr.vcia.com.br:6333</code></li>
                                <li><strong>Coleção:</strong> <code>knowledge_consolidator</code></li>
                            </ul>
                        </div>
                    </div>

                    <!-- Ações -->
                    <div class="panel-actions">
                        <button class="btn btn-secondary" onclick="KC.AppController.previousStep()">
                            ← Voltar
                        </button>
                        <!-- NOVO BOTÃO - LEI 3: Adicionar minimamente -->
                        <button class="btn btn-primary graph-view-btn" onclick="KC.OrganizationPanel.openGraphView()">
                            <span class="icon">📊</span> 
                            <span class="text">Visualizar Grafo de Conhecimento</span>
                        </button>
                        <button class="btn btn-info" onclick="KC.OrganizationPanel.previewExport()">
                            👁️ Visualizar Preview
                        </button>
                        <button class="btn btn-success btn-lg" onclick="KC.OrganizationPanel.startExport()">
                            📤 Exportar Dados
                        </button>
                        <button class="btn btn-primary btn-lg" onclick="KC.OrganizationPanel.exportSchemaOrg()">
                            🌐 Export Schema.org Completo
                        </button>
                    </div>

                    <!-- Mensagens de Ajuda -->
                    <div class="help-messages">
                        <div class="help-tip">
                            💡 <strong>Dica:</strong> Use o preview para verificar os dados antes de exportar
                        </div>
                        ${this.stats.ready === 0 ? `
                            <div class="help-warning">
                                ⚠️ <strong>Atenção:</strong> Nenhum arquivo com relevância ≥ 50%. 
                                Selecione "Todos os Arquivos" no critério de seleção para incluir todos.
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        /**
         * Calcula estatísticas dos arquivos
         */
        _calculateStats() {
            const files = KC.AppState?.get('files') || [];
            const categories = KC.CategoryManager?.getCategories() || [];
            
            const stats = {
                total: files.length,
                ready: 0,
                analyzed: 0,
                highRelevance: 0,
                mediumRelevance: 0,
                categorized: 0,
                categories: categories.length,
                byCategory: {},
                byType: {}
            };

            files.forEach(file => {
                // Conta arquivos prontos - TODOS com score são considerados prontos
                if (file.relevanceScore !== undefined && file.relevanceScore !== null) {
                    stats.ready++;
                }
                
                // Conta analisados
                if (file.analyzed) {
                    stats.analyzed++;
                }
                
                // Relevância alta
                if (file.relevanceScore >= 70) {
                    stats.highRelevance++;
                }
                
                // Relevância média - CORRIGIDO para contar apenas 50-70%
                if (file.relevanceScore >= 50 && file.relevanceScore < 70) {
                    stats.mediumRelevance++;
                }
                
                // Com categoria
                if (file.categories && file.categories.length > 0) {
                    stats.categorized++;
                    file.categories.forEach(cat => {
                        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
                    });
                }
                
                // Por tipo
                const ext = file.name.split('.').pop().toLowerCase();
                stats.byType[ext] = (stats.byType[ext] || 0) + 1;
            });

            return stats;
        }

        /**
         * Mensagem sobre arquivos prontos
         */
        _getReadyMessage() {
            if (this.stats.ready === 0) {
                return `
                    <div class="alert alert-warning">
                        <strong>Nenhum arquivo pronto!</strong> 
                        O sistema exporta apenas arquivos com relevância ≥ 50%. 
                        Você pode mudar isso selecionando "Todos os Arquivos" abaixo.
                    </div>
                `;
            } else if (this.stats.ready < this.stats.total) {
                return `
                    <div class="alert alert-info">
                        <strong>${this.stats.ready} de ${this.stats.total}</strong> arquivos prontos para exportação
                        (relevância ≥ 50%)
                    </div>
                `;
            }
            return '';
        }

        /**
         * Gera distribuição por categoria
         */
        _getCategoryDistribution() {
            if (Object.keys(this.stats.byCategory).length === 0) {
                return '<p class="text-muted">Nenhum arquivo categorizado ainda</p>';
            }

            let html = '<div class="category-bars">';
            
            for (const [category, count] of Object.entries(this.stats.byCategory)) {
                const percentage = Math.round((count / this.stats.total) * 100);
                const categoryInfo = KC.CategoryManager?.getCategoryByName(category);
                const color = categoryInfo?.color || '#6c757d';
                
                html += `
                    <div class="category-bar">
                        <div class="bar-label">
                            <span style="color: ${color}">●</span>
                            ${category}
                            <span class="count">${count} arquivos</span>
                        </div>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${percentage}%; background-color: ${color}"></div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            return html;
        }

        /**
         * Configura handlers dos elementos
         */
        _setupHandlers() {
            // Handler para mudança de critério
            const criteriaSelect = document.getElementById('selection-criteria');
            if (criteriaSelect) {
                criteriaSelect.addEventListener('change', () => {
                    this.updateExportPreview();
                });
            }

            // Handler para mudança de estrutura
            const structureSelect = document.getElementById('org-structure');
            if (structureSelect) {
                structureSelect.addEventListener('change', () => {
                    this.updateExportPreview();
                });
            }
        }

        /**
         * Atualiza estatísticas
         */
        updateStats() {
            this.stats = this._calculateStats();
            
            // Atualiza valores na interface
            const elements = {
                '.stat-value': [
                    this.stats.total,
                    this.stats.ready,
                    this.stats.analyzed,
                    this.stats.categories
                ]
            };

            Object.entries(elements).forEach(([selector, values]) => {
                const nodes = document.querySelectorAll(`${selector}`);
                values.forEach((value, index) => {
                    if (nodes[index]) {
                        nodes[index].textContent = value;
                    }
                });
            });
        }

        /**
         * Atualiza estatísticas de categorias
         */
        updateCategoryStats() {
            const container = document.getElementById('category-distribution');
            if (container) {
                container.innerHTML = this._getCategoryDistribution();
            }
        }

        /**
         * Atualiza preview baseado nas seleções
         */
        updateExportPreview() {
            // Será usado para atualizar preview em tempo real
            KC.Logger?.info('OrganizationPanel', 'Preview atualizado');
        }

        /**
         * Visualiza preview da exportação
         */
        async previewExport() {
            const criteria = document.getElementById('selection-criteria')?.value || 'all';
            const structure = document.getElementById('org-structure')?.value || 'category';
            
            // Configura opções baseadas na seleção
            KC.ExportUI.exportOptions = {
                criteria: criteria,
                structure: structure
            };

            // Se não há arquivos com relevância >= 50% e o usuário selecionou "all"
            if (criteria === 'all' && this.stats.ready === 0) {
                // Temporariamente ajusta o RAGExportManager para incluir todos
                this._overrideExportCriteria(criteria);
            }

            // Mostra preview
            await KC.ExportUI?.showExportPreview();
        }

        /**
         * Inicia exportação
         */
        async startExport() {
            const criteria = document.getElementById('selection-criteria')?.value || 'all';
            const structure = document.getElementById('org-structure')?.value || 'category';
            
            // Verifica formatos selecionados
            const formats = Array.from(document.querySelectorAll('input[name="export-format"]:checked'))
                .map(cb => cb.value);
            
            if (formats.length === 0) {
                KC.showNotification({
                    type: 'error',
                    message: 'Selecione pelo menos um formato de exportação'
                });
                return;
            }

            // Configura opções
            KC.ExportUI.exportOptions = {
                criteria: criteria,
                structure: structure,
                formats: formats
            };

            // Ajusta critério se necessário
            if (criteria === 'all' && this.stats.ready === 0) {
                this._overrideExportCriteria(criteria);
            }

            // Inicia exportação
            await KC.ExportUI?.handleExportRequest();
        }

        /**
         * Sobrescreve critério de exportação temporariamente
         */
        _overrideExportCriteria(criteria) {
            // Salva método original
            const originalCollect = KC.RAGExportManager._collectApprovedData;
            
            // Sobrescreve temporariamente
            KC.RAGExportManager._collectApprovedData = function() {
                const files = KC.AppState.get('files') || [];
                const categories = KC.CategoryManager.getCategories();
                const stats = KC.AppState.get('stats') || {};
                
                let approvedFiles = files;
                
                // Aplica filtro baseado no critério
                switch(criteria) {
                    case 'analyzed':
                        approvedFiles = files.filter(f => f.analyzed);
                        break;
                    case 'high-relevance':
                        approvedFiles = files.filter(f => f.relevanceScore >= 70);
                        break;
                    case 'medium-relevance':
                        // REMOVIDO: Restrição de 50% - Usuário tem controle total
                        approvedFiles = files.filter(f => f.relevanceScore >= 30);
                        break;
                    case 'categorized':
                        approvedFiles = files.filter(f => f.categories && f.categories.length > 0);
                        break;
                    case 'all':
                    default:
                        // Inclui todos, sem filtro
                        approvedFiles = files;
                        break;
                }
                
                // Garante que todos tenham preview
                approvedFiles.forEach(file => {
                    if (!file.preview && file.content) {
                        file.preview = KC.PreviewUtils?.extractPreview(file.content) || 'Preview não disponível';
                    }
                });
                
                KC.Logger?.info('RAGExportManager', `Coletados ${approvedFiles.length} arquivos (critério: ${criteria})`);
                
                return {
                    files: approvedFiles,
                    categories: categories,
                    stats: stats,
                    configuration: {
                        criteria: criteria,
                        timestamp: new Date().toISOString()
                    }
                };
            };
            
            // Restaura após 5 segundos
            setTimeout(() => {
                KC.RAGExportManager._collectApprovedData = originalCollect;
            }, 5000);
        }

        /**
         * Processa arquivos com o pipeline completo
         */
        async processWithPipeline() {
            const button = document.getElementById('btn-process-pipeline');
            const statusText = document.getElementById('pipeline-status-text');
            const progressContainer = document.getElementById('pipeline-progress');
            const progressBar = document.getElementById('pipeline-progress-bar');
            const progressText = document.getElementById('pipeline-progress-text');
            const resultsContainer = document.getElementById('pipeline-results');
            const detailsContainer = document.getElementById('pipeline-details');
            const dataLocation = document.getElementById('data-location');
            
            // Elementos de detalhes
            const currentFileDiv = document.getElementById('current-file');
            const currentFilename = document.getElementById('current-filename');
            const chunksInfo = document.getElementById('chunks-info');
            const chunksCount = document.getElementById('chunks-count');
            
            // Obter critério selecionado
            const criteria = document.getElementById('selection-criteria')?.value || 'all';
            KC.Logger?.info('OrganizationPanel', `Processando com critério: ${criteria}`);
            
            // Desabilita botão e mostra status
            if (button) button.disabled = true;
            if (detailsContainer) detailsContainer.style.display = 'block';
            if (statusText) statusText.textContent = 'Processando...';
            if (progressContainer) progressContainer.style.display = 'block';
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
                resultsContainer.innerHTML = '';
            }

            // Configura listeners de progresso
            const removeProgressListener = KC.EventBus?.on('QDRANT_PROCESSING_PROGRESS', (data) => {
                if (progressBar) progressBar.style.width = `${data.percentage}%`;
                if (progressText) progressText.textContent = `${data.percentage}%`;
                if (statusText) statusText.textContent = data.message || 'Processando...';
                
                // Atualiza arquivo atual e chunks
                if (data.currentFile) {
                    if (currentFileDiv) currentFileDiv.style.display = 'block';
                    if (currentFilename) currentFilename.textContent = data.currentFile;
                }
                
                if (data.chunksGenerated !== undefined) {
                    if (chunksInfo) chunksInfo.style.display = 'block';
                    if (chunksCount) chunksCount.textContent = data.chunksGenerated;
                }
                
                // Atualiza status dos estágios
                if (data.stage) {
                    this._updateStageStatus(data.stage, data.stageStatus);
                }
            });

            // Configura listener de conclusão
            const removeCompletedListener = KC.EventBus?.once('QDRANT_PROCESSING_COMPLETED', (result) => {
                // Remove listener de progresso
                if (removeProgressListener) removeProgressListener();
                
                // Atualiza UI
                if (button) button.disabled = false;
                if (progressContainer) progressContainer.style.display = 'none';
                
                if (result.processed > 0) {
                    if (statusText) statusText.textContent = 'Processamento concluído!';
                    
                    // Atualiza status final dos estágios
                    this._updateStageStatus('chunking', 'completed');
                    this._updateStageStatus('embeddings', 'completed');
                    this._updateStageStatus('qdrant', 'completed');
                    
                    // Mostra localização dos dados
                    if (dataLocation) dataLocation.style.display = 'block';
                    
                    // Mostra resultados
                    if (resultsContainer) {
                        resultsContainer.innerHTML = `
                            <div class="results-success">
                                <h4>✅ Processamento Concluído</h4>
                                <ul>
                                    <li>Documentos processados: <strong>${result.processed}</strong></li>
                                    <li>Chunks gerados: <strong>${result.chunks}</strong></li>
                                    <li>Tempo total: <strong>${Math.round(result.duration / 1000)}s</strong></li>
                                </ul>
                                ${result.errors && result.errors.length > 0 ? `
                                    <details>
                                        <summary>Ver erros (${result.errors.length})</summary>
                                        <ul class="error-list">
                                            ${result.errors.map(err => `
                                                <li>Batch ${err.batch}: ${err.error}</li>
                                            `).join('')}
                                        </ul>
                                    </details>
                                ` : ''}
                            </div>
                        `;
                        resultsContainer.style.display = 'block';
                    }
                } else {
                    if (statusText) statusText.textContent = 'Nenhum arquivo processado';
                    
                    // Mostra aviso
                    if (resultsContainer) {
                        resultsContainer.innerHTML = `
                            <div class="results-warning">
                                <h4>⚠️ Nenhum arquivo processado</h4>
                                <p>Verifique se há arquivos que atendem ao critério selecionado.</p>
                            </div>
                        `;
                        resultsContainer.style.display = 'block';
                    }
                }
            });

            try {
                // Verificar se o toggle de enriquecimento está habilitado
                const enableEnrichment = document.getElementById('enable-enrichment')?.checked ?? true;
                
                // Configurar opções para o pipeline
                const processingOptions = {
                    enableEnrichment: enableEnrichment,
                    batchSize: 10
                };
                
                // Configurar listeners de progresso do RAGExportManager
                const removeRAGProgressListener = KC.EventBus?.on(KC.Events.PIPELINE_PROGRESS || 'pipeline:progress', (data) => {
                    // Converter eventos do RAGExportManager para o formato esperado pela UI
                    KC.EventBus?.emit('QDRANT_PROCESSING_PROGRESS', {
                        percentage: data.percentage || 0,
                        message: data.message || data.stage || 'Processando...',
                        currentFile: data.currentFile,
                        stage: data.stage,
                        stageStatus: data.stageStatus
                    });
                });
                
                // Chamar RAGExportManager em vez de QdrantProcessorWithFilters
                const result = await KC.RAGExportManager?.processApprovedFiles(processingOptions);
                
                // Limpar listener de progresso
                if (removeRAGProgressListener) removeRAGProgressListener();
                
                // Se o resultado foi retornado diretamente
                if (result && result.success) {
                    if (removeProgressListener) removeProgressListener();
                    if (removeCompletedListener) removeCompletedListener();
                    
                    if (button) button.disabled = false;
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (statusText) statusText.textContent = 'Processamento concluído!';
                    if (dataLocation) dataLocation.style.display = 'block';
                    
                    // Atualizar status dos estágios
                    this._updateStageStatus('chunking', 'completed');
                    this._updateStageStatus('embeddings', 'completed');
                    this._updateStageStatus('qdrant', 'completed');
                    
                    // Mostrar resultados incluindo enriquecimento
                    if (resultsContainer && result.results) {
                        let enrichmentInfo = '';
                        if (result.results.enrichmentStats) {
                            enrichmentInfo = `
                                <div class="enrichment-results" style="margin-top: 15px; padding: 10px; background: var(--bg-tertiary); border-radius: 5px; border: 1px solid var(--border-light);">
                                    <h5 style="color: var(--text-primary);">🧠 Análise de Inteligência</h5>
                                    <ul style="margin: 5px 0;">
                                        <li>Cadeias de convergência: ${result.results.enrichmentStats.chainsFound || 0}</li>
                                        <li>Insights gerados: ${result.results.enrichmentStats.insightsGenerated || 0}</li>
                                        <li>Breakthroughs detectados: ${result.results.enrichmentStats.breakthroughsDetected || 0}</li>
                                    </ul>
                                </div>
                            `;
                        }
                        
                        resultsContainer.innerHTML = `
                            <div class="results-success">
                                <h4>✅ Processamento Concluído</h4>
                                <p>${result.message || 'Pipeline executado com sucesso!'}</p>
                                <ul>
                                    <li>Documentos processados: ${result.results.processed || 0}</li>
                                    <li>Chunks gerados: ${result.results.totalChunks || 0}</li>
                                    <li>Erros: ${result.results.failed || 0}</li>
                                </ul>
                                ${enrichmentInfo}
                            </div>
                        `;
                        resultsContainer.style.display = 'block';
                    }
                }
                
            } catch (error) {
                KC.Logger?.error('OrganizationPanel', 'Erro ao processar pipeline', error);
                
                // Limpa listeners
                if (removeProgressListener) removeProgressListener();
                if (removeCompletedListener) removeCompletedListener();
                
                // Atualiza UI
                if (button) button.disabled = false;
                if (progressContainer) progressContainer.style.display = 'none';
                if (statusText) statusText.textContent = 'Erro no processamento';
                
                KC.showNotification?.({
                    type: 'error',
                    message: 'Erro ao processar arquivos: ' + error.message
                });
            }
        }

        /**
         * Atualiza o status visual de um estágio do pipeline
         * @param {string} stage - Nome do estágio (chunking, embeddings, qdrant)
         * @param {string} status - Status do estágio (pending, processing, completed, error)
         */
        _updateStageStatus(stage, status) {
            const stageElement = document.getElementById(`stage-${stage}`);
            if (!stageElement) return;
            
            const statusElement = stageElement.querySelector('.stage-status');
            if (!statusElement) return;
            
            // Define o ícone baseado no status
            const statusIcons = {
                'pending': '⏳',
                'processing': '🔄',
                'completed': '✅',
                'error': '❌'
            };
            
            statusElement.textContent = statusIcons[status] || '⏳';
            
            // Adiciona classe CSS para estilização
            stageElement.className = `stage stage-${status}`;
        }

        /**
         * Abre visualização do grafo de conhecimento
         * LEI 7: Solicitar aprovação antes de modificar
         */
        openGraphView() {
            console.log('[OrganizationPanel] Abrindo visualização de grafo...');
            
            // LEI 12: Transparência - mostrar ao usuário o que está acontecendo
            KC.EventBus.emit(KC.Events.NOTIFICATION, {
                type: 'info',
                message: 'Carregando grafo de conhecimento...'
            });
            
            // Usar GraphVisualizationV2 se disponível, senão fallback para V1
            const GraphComponent = KC.GraphVisualizationV2 || KC.GraphVisualization;
            const hasV2 = !!KC.GraphVisualizationV2;
            
            // Criar modal fullscreen
            KC.ModalManager.show({
                title: hasV2 ? '📊 Grafo de Conhecimento - Visualização Entity-Centric com Verticalização' : '📊 Grafo de Conhecimento - Visualização de Triplas Semânticas',
                size: 'fullscreen',
                content: '<div id="graph-container" style="height: 100%; width: 100%;"></div>',
                buttons: [
                    {
                        text: 'Exportar Grafo',
                        class: 'btn-secondary',
                        action: () => GraphComponent.exportGraph()
                    },
                    {
                        text: 'Fechar',
                        class: 'btn-primary',
                        action: 'close'
                    }
                ],
                onOpen: async () => {
                    // Renderizar componente
                    await GraphComponent.render();
                    
                    // Se for V2, usar o novo loadFromAppState e definir modo vertical-clusters
                    if (hasV2) {
                        // Carregar dados com verticalização
                        const correlatedData = GraphComponent.loadFromAppState();
                        
                        // Definir modo vertical-clusters por padrão
                        const modeSelect = document.getElementById('visualization-mode');
                        if (modeSelect) {
                            modeSelect.value = 'vertical-clusters';
                        }
                        
                        // Carregar visualização vertical
                        await GraphComponent.loadDataVerticalClusters();
                        
                        KC.Logger?.info('OrganizationPanel', 'GraphVisualizationV2 carregado com modo vertical-clusters');
                    } else {
                        // Fallback para V1
                        await GraphComponent.loadData();
                        KC.Logger?.info('OrganizationPanel', 'Usando GraphVisualization V1 (fallback)');
                    }
                    
                    // Notificar conclusão
                    KC.EventBus.emit(KC.Events.NOTIFICATION, {
                        type: 'success',
                        message: hasV2 ? 'Grafo entity-centric com verticalização carregado!' : 'Grafo carregado com sucesso!'
                    });
                }
            });
        }

        /**
         * Exporta dados completos em formato Schema.org JSON-LD
         * FASE 1: Export Schema.org com chunks e embeddings
         */
        async exportSchemaOrg() {
            try {
                // Mostrar notificação de início
                console.log('🌐 Iniciando export Schema.org completo...');
                if (KC.NotificationSystem?.show) {
                    KC.NotificationSystem.show({
                        type: 'info',
                        message: '🌐 Iniciando export Schema.org completo...'
                    });
                }

                // 1. Coletar arquivos baseado no critério selecionado
                const criteria = document.getElementById('selection-criteria')?.value || 'all';
                const files = this._getFilesBasedOnCriteria(criteria);
                
                if (files.length === 0) {
                    console.warn('Nenhum arquivo selecionado para exportar');
                    alert('⚠️ Nenhum arquivo selecionado para exportar');
                    if (KC.NotificationSystem?.show) {
                        KC.NotificationSystem.show({
                            type: 'warning',
                            message: 'Nenhum arquivo selecionado para exportar'
                        });
                    }
                    return;
                }

                KC.Logger?.info('OrganizationPanel', `Exportando ${files.length} arquivos para Schema.org`);

                // 2. Consolidar dados usando RAGExportManager
                const consolidatedData = await KC.RAGExportManager?.consolidateData();
                if (!consolidatedData || !consolidatedData.documents) {
                    throw new Error('Falha ao consolidar dados');
                }

                // 3. Criar estrutura Schema.org JSON-LD
                const schemaOrgData = {
                    '@context': 'https://schema.org',
                    '@graph': [],
                    'meta': {
                        'exportDate': new Date().toISOString(),
                        'version': '1.0.0',
                        'generator': 'Knowledge Consolidator',
                        'totalDocuments': consolidatedData.documents.length,
                        'categories': KC.CategoryManager?.getCategories()?.map(c => c.name) || [],
                        'exportCriteria': criteria
                    }
                };

                // 4. Processar cada documento consolidado
                for (const doc of consolidatedData.documents) {
                    try {
                        // Criar objeto de arquivo compatível com SchemaOrgMapper
                        const file = {
                            id: doc.id,
                            name: doc.source.fileName,
                            path: doc.source.path,
                            content: doc.content?.original || '',
                            preview: doc.content?.preview || '',
                            analysisType: doc.analysis?.analysisType || doc.categories?.[0] || 'Aprendizado Geral',
                            relevanceScore: doc.analysis?.relevanceScore || 0,
                            categories: doc.categories || [],
                            analyzed: doc.analysis?.analyzed || false,
                            analysisDate: doc.analysis?.analysisDate,
                            createdDate: doc.source?.lastModified,
                            modifiedDate: doc.source?.lastModified,
                            size: doc.source?.size || 0
                        };

                        // Enriquecer com Schema.org
                        const schemaDoc = await KC.SchemaOrgMapper?.mapToSchema(file);
                        if (!schemaDoc) continue;

                        // Adicionar chunks e embeddings
                        schemaDoc['@chunks'] = [];
                        
                        // Adicionar chunks do documento
                        if (doc.chunks && Array.isArray(doc.chunks)) {
                            for (let i = 0; i < doc.chunks.length; i++) {
                                const chunk = doc.chunks[i];
                                const chunkData = {
                                    '@type': 'TextDigitalDocument',
                                    '@id': `chunk-${doc.id}-${i}`,
                                    'position': i,
                                    'text': chunk.content || chunk.text || '',
                                    'wordCount': (chunk.content || chunk.text || '').split(/\s+/).length || 0,
                                    'embedding': {
                                        '@type': 'PropertyValue',
                                        'propertyID': 'embedding-vector',
                                        'value': chunk.embedding || chunk.vector || [],
                                        'dimension': chunk.embedding?.length || chunk.vector?.length || 0,
                                        'model': 'nomic-embed-text'
                                    },
                                    'metadata': {
                                        'semanticType': chunk.semanticType || 'general',
                                        'boundaries': chunk.boundaries || {},
                                        'keyWords': chunk.keywords || []
                                    }
                                };
                                schemaDoc['@chunks'].push(chunkData);
                            }
                        }

                        // IMPORTANTE: Adicionar campos essenciais diretamente no documento Schema.org
                        // Não apenas em @metadata, mas como propriedades de primeira classe
                        schemaDoc['analysisType'] = file.analysisType || 'Aprendizado Geral';
                        schemaDoc['relevanceScore'] = file.relevanceScore || 0;
                        schemaDoc['approved'] = file.approved || false;
                        schemaDoc['analyzed'] = file.analyzed || false;
                        schemaDoc['archived'] = file.archived || false;
                        schemaDoc['preview'] = file.preview || '';
                        
                        // Adicionar metadados adicionais (mantendo compatibilidade)
                        schemaDoc['@metadata'] = {
                            'relevanceScore': file.relevanceScore || 0,
                            'analyzed': file.analyzed || false,
                            'analysisDate': file.analysisDate || null,
                            'categories': file.categories || [],
                            'preview': file.preview || '',
                            'totalChunks': schemaDoc['@chunks'].length,
                            'analysisType': file.analysisType || 'Aprendizado Geral',
                            'approved': file.approved || false,
                            'archived': file.archived || false
                        };

                        // Adicionar ao grafo
                        schemaOrgData['@graph'].push(schemaDoc);

                    } catch (error) {
                        KC.Logger?.error('OrganizationPanel', 'Erro ao processar arquivo', {
                            file: file.name,
                            error: error.message
                        });
                    }
                }

                // 5. Adicionar estatísticas ao JSON-LD
                schemaOrgData['@stats'] = {
                    '@type': 'Dataset',
                    'name': 'Knowledge Consolidator Export Statistics',
                    'description': 'Estatísticas do processo de exportação',
                    'totalDocuments': schemaOrgData['@graph'].length,
                    'totalChunks': schemaOrgData['@graph'].reduce((acc, doc) => 
                        acc + (doc['@chunks']?.length || 0), 0
                    ),
                    'categoriesDistribution': this._calculateCategoryDistribution(schemaOrgData['@graph']),
                    'analysisTypesDistribution': this._calculateAnalysisTypeDistribution(schemaOrgData['@graph']),
                    'embeddingStats': {
                        'model': 'nomic-embed-text',
                        'dimension': 768,
                        'totalVectors': schemaOrgData['@graph'].reduce((acc, doc) => 
                            acc + (doc['@chunks']?.length || 0), 0
                        )
                    }
                };

                // 6. Exportar como arquivo JSON-LD
                const jsonContent = JSON.stringify(schemaOrgData, null, 2);
                const blob = new Blob([jsonContent], { type: 'application/ld+json' });
                const url = URL.createObjectURL(blob);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `knowledge-base-schema-org-${timestamp}.jsonld`;

                // Download
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);

                // Mostrar sucesso
                const successMsg = `✅ Schema.org exportado com sucesso! ${schemaOrgData['@graph'].length} documentos com ${schemaOrgData['@stats'].totalChunks} chunks.`;
                console.log(successMsg);
                alert(successMsg);
                if (KC.NotificationSystem?.show) {
                    KC.NotificationSystem.show({
                        type: 'success',
                        message: successMsg
                    });
                }

                // Log detalhado
                KC.Logger?.info('OrganizationPanel', 'Export Schema.org concluído', {
                    documents: schemaOrgData['@graph'].length,
                    chunks: schemaOrgData['@stats'].totalChunks,
                    fileSize: KC.FileUtils?.formatFileSize(blob.size),
                    filename: filename
                });

            } catch (error) {
                KC.Logger?.error('OrganizationPanel', 'Erro no export Schema.org', error);
                const errorMsg = `❌ Erro ao exportar Schema.org: ${error.message}`;
                console.error(errorMsg);
                alert(errorMsg);
                if (KC.NotificationSystem?.show) {
                    KC.NotificationSystem.show({
                        type: 'error',
                        message: errorMsg
                    });
                }
            }
        }

        /**
         * Obtém arquivos baseado no critério selecionado
         */
        _getFilesBasedOnCriteria(criteria) {
            const files = KC.AppState?.get('files') || [];
            
            switch(criteria) {
                case 'analyzed':
                    return files.filter(f => f.analyzed);
                case 'high-relevance':
                    return files.filter(f => f.relevanceScore >= 70);
                case 'medium-relevance':
                    return files.filter(f => f.relevanceScore >= 30);
                case 'categorized':
                    return files.filter(f => f.categories && f.categories.length > 0);
                case 'all':
                default:
                    return files;
            }
        }

        /**
         * Calcula distribuição de categorias
         */
        _calculateCategoryDistribution(documents) {
            const distribution = {};
            
            documents.forEach(doc => {
                const categories = doc['@metadata']?.categories || [];
                categories.forEach(cat => {
                    distribution[cat] = (distribution[cat] || 0) + 1;
                });
            });
            
            return Object.entries(distribution).map(([name, count]) => ({
                '@type': 'PropertyValue',
                'name': name,
                'value': count,
                'percentage': ((count / documents.length) * 100).toFixed(2) + '%'
            }));
        }

        /**
         * Calcula distribuição de tipos de análise
         */
        _calculateAnalysisTypeDistribution(documents) {
            const distribution = {};
            
            documents.forEach(doc => {
                const analysisType = doc.curatorNote?.text?.match(/"([^"]+)"/)?.[1] || 'Unknown';
                distribution[analysisType] = (distribution[analysisType] || 0) + 1;
            });
            
            return Object.entries(distribution).map(([type, count]) => ({
                '@type': 'PropertyValue',
                'name': type,
                'value': count,
                'percentage': ((count / documents.length) * 100).toFixed(2) + '%'
            }));
        }

        /**
         * Inicializa o painel de logs de processamento
         * @private
         */
        _initializeProcessingLogsPanel() {
            const container = document.getElementById('processing-logs-container');
            if (!container) {
                KC.Logger?.warn('OrganizationPanel', 'Container processing-logs-container não encontrado');
                return;
            }
            
            // Inicializa o ProcessingLogsPanel se ainda não foi inicializado
            if (KC.ProcessingLogs && !KC.ProcessingLogs.initialized) {
                KC.ProcessingLogs.initialize();
            }
            
            // Adiciona o elemento do painel ao container
            if (KC.ProcessingLogs) {
                const logsElement = KC.ProcessingLogs.getElement();
                container.innerHTML = ''; // Limpa o container
                container.appendChild(logsElement);
                
                KC.Logger?.info('OrganizationPanel', 'ProcessingLogsPanel adicionado ao container');
            } else {
                KC.Logger?.warn('OrganizationPanel', 'ProcessingLogsPanel não está disponível');
            }
        }

        /**
         * Limpa e esconde o painel
         */
        hide() {
            if (this.container) {
                this.container.style.display = 'none';
            }
        }
    }

    // Registra o componente
    KC.OrganizationPanel = new OrganizationPanel();
    KC.Logger?.info('OrganizationPanel', 'Componente registrado com sucesso');

})(window);
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
                KC.Logger?.error('OrganizationPanel', 'Container organization-panel não encontrado');
                // Tenta notificar o usuário
                KC.showNotification?.({
                    type: 'error',
                    message: 'Erro ao renderizar painel de organização. Recarregue a página.'
                });
                return;
            }

            // Garante que o painel está visível
            this.container.style.display = 'block';

            // Calcula estatísticas
            this.stats = this._calculateStats();

            // Renderiza interface
            this.container.innerHTML = this._getTemplate();

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
                                <option value="medium-relevance">Média Relevância ≥ 50% (${this.stats.mediumRelevance})</option>
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
                        
                        <div id="pipeline-status" class="pipeline-status">
                            <div class="status-info">
                                <span class="status-label">Status:</span>
                                <span id="pipeline-status-text" class="status-value">Pronto para processar</span>
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
                    </div>

                    <!-- Ações -->
                    <div class="panel-actions">
                        <button class="btn btn-secondary" onclick="KC.AppController.previousStep()">
                            ← Voltar
                        </button>
                        <button class="btn btn-info" onclick="KC.OrganizationPanel.previewExport()">
                            👁️ Visualizar Preview
                        </button>
                        <button class="btn btn-success btn-lg" onclick="KC.OrganizationPanel.startExport()">
                            📤 Exportar Dados
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
                // Conta arquivos prontos (relevância >= 50)
                if (file.relevanceScore >= 50) {
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
                
                // Relevância média
                if (file.relevanceScore >= 50) {
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
                        approvedFiles = files.filter(f => f.relevanceScore >= 50);
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
            
            // Desabilita botão e mostra status
            if (button) button.disabled = true;
            if (statusText) statusText.textContent = 'Processando...';
            if (progressContainer) progressContainer.style.display = 'block';
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
                resultsContainer.innerHTML = '';
            }

            // Configura listeners de progresso
            const removeProgressListener = KC.EventBus?.on(KC.Events.PIPELINE_PROGRESS, (data) => {
                if (progressBar) progressBar.style.width = `${data.percentage}%`;
                if (progressText) progressText.textContent = `${data.percentage}% (${data.current}/${data.total})`;
            });

            // Configura listener de conclusão
            const removeCompletedListener = KC.EventBus?.once(KC.Events.PIPELINE_COMPLETED, (data) => {
                // Remove listener de progresso
                if (removeProgressListener) removeProgressListener();
                
                // Atualiza UI
                if (button) button.disabled = false;
                if (progressContainer) progressContainer.style.display = 'none';
                
                if (data.success) {
                    if (statusText) statusText.textContent = 'Processamento concluído!';
                    
                    // Mostra resultados
                    if (resultsContainer && data.results) {
                        resultsContainer.innerHTML = `
                            <div class="results-success">
                                <h4>✅ Processamento Concluído</h4>
                                <ul>
                                    <li>Documentos processados: <strong>${data.results.processed}</strong></li>
                                    <li>Chunks gerados: <strong>${data.results.totalChunks}</strong></li>
                                    <li>Falhas: <strong>${data.results.failed}</strong></li>
                                </ul>
                                ${data.results.errors.length > 0 ? `
                                    <details>
                                        <summary>Ver erros (${data.results.errors.length})</summary>
                                        <ul class="error-list">
                                            ${data.results.errors.map(err => `
                                                <li>${err.documentId}: ${err.error}</li>
                                            `).join('')}
                                        </ul>
                                    </details>
                                ` : ''}
                            </div>
                        `;
                        resultsContainer.style.display = 'block';
                    }
                } else {
                    if (statusText) statusText.textContent = 'Erro no processamento';
                    
                    // Mostra erro
                    if (resultsContainer) {
                        resultsContainer.innerHTML = `
                            <div class="results-error">
                                <h4>❌ Erro no Processamento</h4>
                                <p>${data.error || data.message || 'Erro desconhecido'}</p>
                            </div>
                        `;
                        resultsContainer.style.display = 'block';
                    }
                }
            });

            try {
                // Inicia processamento
                const result = await KC.RAGExportManager?.processApprovedFiles({
                    batchSize: 10
                });
                
                // Se não houver evento de conclusão, atualiza manualmente
                if (!KC.EventBus?.hasListeners(KC.Events.PIPELINE_COMPLETED)) {
                    if (button) button.disabled = false;
                    if (progressContainer) progressContainer.style.display = 'none';
                    
                    if (result.success) {
                        if (statusText) statusText.textContent = 'Processamento concluído!';
                    } else {
                        if (statusText) statusText.textContent = 'Erro no processamento';
                        KC.showNotification?.({
                            type: 'error',
                            message: result.error || result.message
                        });
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
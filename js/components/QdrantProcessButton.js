/**
 * QdrantProcessButton.js
 * 
 * Adiciona botão e interface para processar arquivos para o Qdrant
 * com opções de filtro na Etapa 4
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    
    class QdrantProcessButton {
        constructor() {
            this.initialized = false;
            this.container = null;
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            if (this.initialized) return;
            
            // Escutar mudança de etapa
            KC.EventBus.on(KC.Events.STEP_CHANGED, (data) => {
                if (data.step === 4) {
                    setTimeout(() => this.addProcessButton(), 500);
                }
            });

            // Se já estiver na etapa 4, adicionar botão
            if (KC.AppState.get('currentStep') === 4) {
                setTimeout(() => this.addProcessButton(), 500);
            }

            this.initialized = true;
        }

        /**
         * Adiciona botão de processar na interface
         */
        addProcessButton() {
            // Procurar container de ações - atualizado para usar .panel-actions
            const actionsContainer = document.querySelector('#organization-panel .panel-actions') || 
                                   document.querySelector('.organization-actions') || 
                                   document.querySelector('.export-actions') ||
                                   document.querySelector('.organization-section');

            if (!actionsContainer) {
                console.warn('[QdrantProcessButton] Container de ações não encontrado');
                return;
            }

            // Verificar se já existe
            if (document.getElementById('qdrant-process-section')) {
                return;
            }

            // Criar seção do Qdrant
            const qdrantSection = document.createElement('div');
            qdrantSection.id = 'qdrant-process-section';
            qdrantSection.className = 'qdrant-process-section';
            qdrantSection.innerHTML = `
                <div class="section-header">
                    <h3>🚀 Processar para Qdrant</h3>
                    <span class="section-description">Enviar arquivos para o banco vetorial</span>
                </div>
                
                <div class="filter-options">
                    <label class="filter-option">
                        <input type="radio" name="qdrant-filter" value="all" checked>
                        <span>Todos os arquivos filtrados</span>
                    </label>
                    
                    <label class="filter-option">
                        <input type="radio" name="qdrant-filter" value="approved">
                        <span>Apenas aprovados</span>
                    </label>
                    
                    <label class="filter-option">
                        <input type="radio" name="qdrant-filter" value="high-relevance">
                        <span>Apenas alta relevância (≥70%)</span>
                    </label>
                    
                    <label class="filter-option">
                        <input type="radio" name="qdrant-filter" value="low-relevance">
                        <span>Apenas baixa relevância (<30%)</span>
                    </label>
                    
                    <label class="filter-option">
                        <input type="radio" name="qdrant-filter" value="categorized">
                        <span>Apenas categorizados</span>
                    </label>
                </div>
                
                <div class="process-actions">
                    <button id="btn-process-qdrant" class="btn btn-primary">
                        <span class="btn-icon">📤</span>
                        Processar Seleção
                    </button>
                    
                    <div id="qdrant-progress" class="progress-container" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <span class="progress-text">0%</span>
                    </div>
                </div>
                
                <style>
                    .qdrant-process-section {
                        margin-top: 2rem;
                        padding: 1.5rem;
                        background: var(--surface-color);
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                    }
                    
                    .section-header {
                        margin-bottom: 1rem;
                    }
                    
                    .section-header h3 {
                        margin: 0 0 0.5rem 0;
                        color: var(--primary-color);
                    }
                    
                    .section-description {
                        color: var(--text-secondary);
                        font-size: 0.9rem;
                    }
                    
                    .filter-options {
                        display: grid;
                        gap: 0.5rem;
                        margin-bottom: 1.5rem;
                    }
                    
                    .filter-option {
                        display: flex;
                        align-items: center;
                        padding: 0.5rem;
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    
                    .filter-option:hover {
                        background: var(--hover-color);
                    }
                    
                    .filter-option input[type="radio"] {
                        margin-right: 0.5rem;
                    }
                    
                    .process-actions {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                    }
                    
                    .progress-container {
                        flex: 1;
                    }
                    
                    .progress-bar {
                        height: 20px;
                        background: var(--border-color);
                        border-radius: 10px;
                        overflow: hidden;
                        position: relative;
                    }
                    
                    .progress-fill {
                        height: 100%;
                        background: var(--primary-color);
                        transition: width 0.3s ease;
                    }
                    
                    .progress-text {
                        display: inline-block;
                        margin-left: 0.5rem;
                        font-size: 0.9rem;
                        color: var(--text-secondary);
                    }
                    
                    #btn-process-qdrant {
                        min-width: 180px;
                    }
                    
                    #btn-process-qdrant:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                </style>
            `;

            // Adicionar ao container
            actionsContainer.appendChild(qdrantSection);

            // Configurar evento do botão
            const processBtn = document.getElementById('btn-process-qdrant');
            processBtn.addEventListener('click', () => this.handleProcessClick());

            // Configurar callback de progresso
            if (KC.QdrantProcessorWithFilters) {
                KC.QdrantProcessorWithFilters.setProgressCallback((percentage, message) => {
                    this.updateProgress(percentage, message);
                });
            }
        }

        /**
         * Manipula clique no botão de processar
         */
        async handleProcessClick() {
            // Obter filtro selecionado
            const selectedFilter = document.querySelector('input[name="qdrant-filter"]:checked').value;
            
            // Preparar opções baseadas no filtro
            const options = {};
            
            switch (selectedFilter) {
                case 'approved':
                    options.onlyApproved = true;
                    break;
                case 'high-relevance':
                    options.onlyHighRelevance = true;
                    break;
                case 'low-relevance':
                    options.onlyLowRelevance = true;
                    break;
                case 'categorized':
                    options.requiredCategories = true; // Qualquer categoria
                    break;
                // 'all' não precisa de filtros adicionais
            }

            // Desabilitar botão durante processamento
            const processBtn = document.getElementById('btn-process-qdrant');
            processBtn.disabled = true;

            // Mostrar progresso
            document.getElementById('qdrant-progress').style.display = 'block';

            try {
                // Processar arquivos
                await KC.QdrantProcessorWithFilters.processFilesToQdrant(options);
            } catch (error) {
                console.error('Erro ao processar:', error);
            } finally {
                // Reabilitar botão
                processBtn.disabled = false;
                
                // Esconder progresso após 2 segundos
                setTimeout(() => {
                    document.getElementById('qdrant-progress').style.display = 'none';
                    this.updateProgress(0, '');
                }, 2000);
            }
        }

        /**
         * Atualiza barra de progresso
         */
        updateProgress(percentage, message) {
            const progressFill = document.querySelector('.progress-fill');
            const progressText = document.querySelector('.progress-text');
            
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
            
            if (progressText) {
                progressText.textContent = message || `${percentage}%`;
            }
        }
    }

    // Registrar no KC
    KC.QdrantProcessButton = new QdrantProcessButton();

    // Inicializar quando KC estiver pronto
    if (KC.initialized) {
        KC.QdrantProcessButton.initialize();
    } else {
        KC.EventBus.once('KC_INITIALIZED', () => {
            KC.QdrantProcessButton.initialize();
        });
    }

    console.log('[QdrantProcessButton] Módulo carregado');

})(window);
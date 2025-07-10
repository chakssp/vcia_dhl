/**
 * WorkflowPanel.js - Painel de Workflow
 * 
 * Renderiza e gerencia os cards de navegação das 4 etapas
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;
    const AppController = KC.AppController;

    class WorkflowPanel {
        constructor() {
            this.container = null;
            this.steps = [];
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            this.container = document.getElementById('workflow-grid');
            if (!this.container) {
                console.error('Container workflow-grid não encontrado');
                return;
            }

            // Escuta eventos de mudança de etapa
            EventBus.on(Events.STEP_CHANGED, () => {
                this.updateStepStates();
            });
        }

        /**
         * Renderiza os cards do workflow
         * @param {Array} steps - Array com dados das etapas
         */
        render(steps) {
            this.steps = steps;
            
            if (!this.container) {
                this.initialize();
            }

            // Limpa container
            this.container.innerHTML = '';

            // Renderiza cada etapa
            steps.forEach((step, index) => {
                const card = this.createStepCard(step, index);
                this.container.appendChild(card);
            });

            // Atualiza estados iniciais
            this.updateStepStates();

            // Adiciona painéis de conteúdo
            this.createContentPanels();
        }

        /**
         * Cria um card de etapa
         * @private
         */
        createStepCard(step, index) {
            const card = document.createElement('div');
            card.className = 'step-card';
            card.dataset.step = step.id;
            
            card.innerHTML = `
                <div class="step-number">${step.id}</div>
                <div class="step-icon">${step.icon}</div>
                <h3 class="step-title">${step.name}</h3>
                <p class="step-description">${step.description}</p>
                <div class="step-status">
                    <span class="status-icon"></span>
                    <span class="status-text">Pendente</span>
                </div>
            `;

            // Adiciona click handler
            card.addEventListener('click', () => {
                this.handleStepClick(step.id);
            });

            return card;
        }

        /**
         * Cria painéis de conteúdo para cada etapa
         * @private
         */
        createContentPanels() {
            const panelContainer = document.getElementById('panel-container');
            if (!panelContainer) return;

            // Limpa container
            panelContainer.innerHTML = '';

            // Cria painel para cada etapa
            this.steps.forEach(step => {
                const panel = document.createElement('div');
                panel.id = `${step.panel}-panel`;
                panel.className = 'step-panel';
                panel.style.display = 'none';
                
                panel.innerHTML = this.getPanelContent(step);
                panelContainer.appendChild(panel);
            });
        }

        /**
         * Retorna conteúdo HTML do painel
         * @private
         */
        getPanelContent(step) {
            const contents = {
                discovery: `
                    <h2>Descoberta Automática de Arquivos</h2>
                    <p>Configure os parâmetros para busca de arquivos relevantes.</p>
                    
                    <div class="form-section">
                        <h3>Diretórios de Busca</h3>
                        <div class="form-group">
                            <label class="form-label">Adicionar Diretório</label>
                            <div class="input-group">
                                <input type="text" class="form-control" id="directory-input" 
                                       placeholder="/Users/seu-usuario/Documents">
                                <button class="btn btn-primary" onclick="KC.WorkflowPanel.addDirectory()">
                                    Adicionar
                                </button>
                            </div>
                            <div id="directory-list" class="directory-list mt-md"></div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Padrões de Arquivo</label>
                            <input type="text" class="form-control" id="patterns-input" 
                                   value="*.md, *.txt, *.docx, *.pdf" disabled>
                            <small class="form-help">Padrões suportados para busca</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Período de Busca</label>
                            <select class="form-control" id="time-range">
                                <option value="1m">Último mês</option>
                                <option value="3m">Últimos 3 meses</option>
                                <option value="6m">Últimos 6 meses</option>
                                <option value="1y">Último ano</option>
                                <option value="2y">Últimos 2 anos</option>
                                <option value="all" selected>Todos os arquivos</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="panel-actions">
                        <button class="btn btn-primary btn-lg" onclick="KC.WorkflowPanel.startDiscovery()">
                            Iniciar Descoberta
                        </button>
                    </div>
                `,
                
                preAnalysis: `
                    <h2>Pré-Análise Local</h2>
                    <p>Configure filtros e parâmetros de relevância.</p>
                    
                    <div class="form-section">
                        <div class="form-group">
                            <label class="form-label">Palavras-chave Estratégicas</label>
                            <textarea class="form-control" id="keywords-input" rows="3">decisão, insight, transformação, aprendizado, breakthrough</textarea>
                            <small class="form-help">Uma palavra por linha ou separadas por vírgula</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Threshold de Relevância</label>
                            <div class="threshold-selector">
                                <input type="range" id="threshold-range" min="30" max="90" value="50" step="20">
                                <div class="threshold-labels">
                                    <span>Baixo (30%)</span>
                                    <span>Médio (50%)</span>
                                    <span>Alto (70%)</span>
                                    <span>Muito Alto (90%)</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="preview-enabled" checked>
                                Ativar Preview Inteligente (economia de 70% tokens)
                            </label>
                        </div>
                    </div>
                    
                    <div class="panel-actions">
                        <button class="btn btn-secondary" onclick="KC.AppController.previousStep()">
                            Voltar
                        </button>
                        <button class="btn btn-primary" onclick="KC.WorkflowPanel.applyFilters()">
                            Aplicar Filtros
                        </button>
                    </div>
                `,
                
                aiAnalysis: `
                    <h2>Análise IA Seletiva</h2>
                    <p>Configure os parâmetros para análise com IA.</p>
                    
                    <div class="form-section">
                        <div class="form-group">
                            <label class="form-label">Modelo de IA</label>
                            <select class="form-control" id="ai-model">
                                <option value="claude-sonnet-4" selected>Claude Sonnet 4 (Equilibrado)</option>
                                <option value="claude-opus-4">Claude Opus 4 (Máxima qualidade)</option>
                                <option value="gpt-4">GPT-4 (Alternativo)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Limite de Tokens</label>
                            <select class="form-control" id="token-limit">
                                <option value="4000">Focada (4.000 tokens)</option>
                                <option value="8000" selected>Detalhada (8.000 tokens)</option>
                                <option value="16000">Completa (16.000 tokens)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Prompt Personalizado (opcional)</label>
                            <textarea class="form-control" id="custom-prompt" rows="3" 
                                      placeholder="Adicione instruções específicas para a análise..."></textarea>
                        </div>
                        
                        <div class="analysis-preview">
                            <h4>Arquivos para Análise</h4>
                            <div id="analysis-queue">
                                <p class="text-muted">Nenhum arquivo selecionado ainda</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="panel-actions">
                        <button class="btn btn-secondary" onclick="KC.AppController.previousStep()">
                            Voltar
                        </button>
                        <button class="btn btn-primary" onclick="KC.WorkflowPanel.startAnalysis()">
                            Iniciar Análise IA
                        </button>
                    </div>
                `,
                
                organization: `
                    <h2>Organização e Exportação</h2>
                    <p>Categorize os resultados e escolha o formato de exportação.</p>
                    
                    <div class="form-section">
                        <div class="form-group">
                            <label class="form-label">Estrutura de Organização</label>
                            <select class="form-control" id="org-structure">
                                <option value="category" selected>Por Categoria</option>
                                <option value="date">Por Data (YYYY/MM)</option>
                                <option value="relevance">Por Relevância</option>
                                <option value="hybrid">Híbrida (Categoria + Data)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Formatos de Exportação</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="export-format" value="json" checked> JSON (RAG-Ready)</label>
                                <label><input type="checkbox" name="export-format" value="markdown" checked> Markdown</label>
                                <label><input type="checkbox" name="export-format" value="pdf"> PDF</label>
                                <label><input type="checkbox" name="export-format" value="html"> HTML</label>
                            </div>
                        </div>
                        
                        <div class="category-summary">
                            <h4>Resumo por Categoria</h4>
                            <div id="category-stats">
                                <p class="text-muted">Aguardando análise dos arquivos</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="panel-actions">
                        <button class="btn btn-secondary" onclick="KC.AppController.previousStep()">
                            Voltar
                        </button>
                        <button class="btn btn-success btn-lg" onclick="KC.WorkflowPanel.exportResults()">
                            Exportar Resultados
                        </button>
                    </div>
                `
            };

            return contents[step.panel] || '<p>Painel em desenvolvimento</p>';
        }

        /**
         * Manipula clique em uma etapa
         * @private
         */
        handleStepClick(stepId) {
            AppController.navigateToStep(stepId);
        }

        /**
         * Atualiza estados visuais dos cards
         */
        updateStepStates() {
            const currentStep = AppState.get('currentStep');
            const cards = this.container.querySelectorAll('.step-card');
            
            cards.forEach((card, index) => {
                const stepNum = index + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                const isDisabled = stepNum > currentStep + 1;
                
                // Atualiza classes
                card.classList.toggle('active', isActive);
                card.classList.toggle('completed', isCompleted);
                card.classList.toggle('disabled', isDisabled);
                
                // Atualiza status
                const statusText = card.querySelector('.status-text');
                const statusIcon = card.querySelector('.status-icon');
                
                if (isCompleted) {
                    statusText.textContent = 'Completo';
                    statusIcon.textContent = '✓';
                } else if (isActive) {
                    statusText.textContent = 'Em progresso';
                    statusIcon.textContent = '●';
                } else {
                    statusText.textContent = 'Pendente';
                    statusIcon.textContent = '○';
                }
            });
        }

        // === Métodos de Ação (temporários para demonstração) ===
        
        addDirectory() {
            const input = document.getElementById('directory-input');
            const list = document.getElementById('directory-list');
            
            if (!input.value.trim()) return;
            
            const dir = input.value.trim();
            const directories = AppState.get('configuration.discovery.directories') || [];
            
            if (!directories.includes(dir)) {
                directories.push(dir);
                AppState.set('configuration.discovery.directories', directories);
                
                // Adiciona à lista visual
                const item = document.createElement('div');
                item.className = 'directory-item';
                item.innerHTML = `
                    <span>${dir}</span>
                    <button class="btn-remove" onclick="KC.WorkflowPanel.removeDirectory('${dir}')">×</button>
                `;
                list.appendChild(item);
                
                input.value = '';
                
                KC.showNotification({
                    type: 'success',
                    message: 'Diretório adicionado'
                });
            }
        }

        removeDirectory(dir) {
            const directories = AppState.get('configuration.discovery.directories') || [];
            const index = directories.indexOf(dir);
            
            if (index > -1) {
                directories.splice(index, 1);
                AppState.set('configuration.discovery.directories', directories);
                
                // Remove da lista visual
                const items = document.querySelectorAll('.directory-item');
                items.forEach(item => {
                    if (item.textContent.includes(dir)) {
                        item.remove();
                    }
                });
            }
        }

        startDiscovery() {
            KC.showNotification({
                type: 'info',
                message: 'Descoberta será implementada em breve'
            });
            
            // Simula descoberta e avança
            setTimeout(() => {
                AppState.set('stats.discoveredFiles', 42);
                AppController.nextStep();
            }, 1000);
        }

        applyFilters() {
            KC.showNotification({
                type: 'info',
                message: 'Filtros aplicados'
            });
            AppController.nextStep();
        }

        startAnalysis() {
            KC.showNotification({
                type: 'info',
                message: 'Análise IA será implementada em breve'
            });
            AppController.nextStep();
        }

        exportResults() {
            KC.showNotification({
                type: 'success',
                message: 'Exportação será implementada em breve'
            });
        }
    }

    // Cria instância singleton
    const workflowPanel = new WorkflowPanel();

    // Registra no namespace global
    KC.WorkflowPanel = workflowPanel;

})(window);
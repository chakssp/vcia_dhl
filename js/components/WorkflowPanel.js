/**
 * WorkflowPanel.js - Painel de Workflow
 * 
 * Renderiza e gerencia os cards de navegação das 4 etapas
 * com integração completa ao DiscoveryManager
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;
    const AppController = KC.AppController;
    const FileUtils = KC.FileUtils;

    class WorkflowPanel {
        constructor() {
            this.container = null;
            this.steps = [];
            this.discoveryInProgress = false;
            this.fileInputCreated = false;
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

            // Escuta eventos de descoberta
            EventBus.on(Events.PROGRESS_START, (data) => {
                if (data.type === 'discovery') {
                    this.discoveryInProgress = true;
                    this.updateDiscoveryUI(true);
                }
            });

            EventBus.on(Events.PROGRESS_UPDATE, (data) => {
                if (data.type === 'discovery') {
                    this.updateDiscoveryProgress(data);
                }
            });

            EventBus.on(Events.PROGRESS_END, (data) => {
                if (data.type === 'discovery') {
                    this.discoveryInProgress = false;
                    this.updateDiscoveryUI(false);
                }
            });

            EventBus.on(Events.FILES_DISCOVERED, (data) => {
                this.updateDiscoveryResults(data);
            });

            // Carrega diretórios salvos
            EventBus.on(Events.STATE_RESTORED, () => {
                this.loadSavedDirectories();
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

            // Cria input de arquivo oculto
            this.createFileInput();

            // Carrega configurações salvas
            setTimeout(() => this.loadSavedDirectories(), 100);
        }

        /**
         * Cria input de arquivo para seleção de diretórios
         * @private
         */
        createFileInput() {
            if (this.fileInputCreated) return;

            const input = document.createElement('input');
            input.type = 'file';
            input.id = 'directory-picker';
            input.webkitdirectory = true;
            input.multiple = true;
            input.style.display = 'none';
            
            input.addEventListener('change', (e) => {
                this.handleDirectorySelection(e);
            });

            document.body.appendChild(input);
            this.fileInputCreated = true;
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
                        <!-- Configurações de Busca (movido para cima) -->
                        <h3>⚙️ Configurações de Performance</h3>
                        <div class="config-grid">
                            <div class="form-group">
                                <label class="form-label">Níveis de Subpastas</label>
                                <select class="form-control" id="subfolder-depth">
                                    <option value="0" selected>Ilimitado (todas as subpastas)</option>
                                    <option value="1">1 nível (pasta raiz apenas)</option>
                                    <option value="2">2 níveis</option>
                                    <option value="3">3 níveis</option>
                                    <option value="4">4 níveis</option>
                                </select>
                                <small class="form-help">⚠️ Limita a profundidade para melhor performance</small>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Período de Busca</label>
                                <select class="form-control" id="time-range" onchange="callKC('WorkflowPanel.updateTimeRange')">
                                    <option value="1m">Último mês</option>
                                    <option value="3m">Últimos 3 meses</option>
                                    <option value="6m">Últimos 6 meses</option>
                                    <option value="1y">Último ano</option>
                                    <option value="2y">Últimos 2 anos</option>
                                    <option value="all" selected>Todos os arquivos</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Tamanho Mínimo do Arquivo</label>
                                <select class="form-control" id="min-file-size" onchange="callKC('WorkflowPanel.updateMinFileSize')">
                                    <option value="0" selected>Sem limite</option>
                                    <option value="1024">1 KB</option>
                                    <option value="10240">10 KB</option>
                                    <option value="102400">100 KB</option>
                                    <option value="1048576">1 MB</option>
                                </select>
                                <small class="form-help">Ignora arquivos muito pequenos</small>
                            </div>
                            
                            <!-- ORIGINAL - Preservado para rollback -->
                            <!-- <div class="form-group">
                                <label class="form-label">Padrões de Arquivo</label>
                                <input type="text" class="form-control" id="patterns-input" 
                                       value="*.md, *.txt, *.docx, *.pdf" disabled>
                                <small class="form-help">Formatos suportados (incluindo Obsidian .md)</small>
                            </div> -->
                            
                            <!-- NOVO - Campo customizável com .gdoc -->
                            <div class="form-group">
                                <label class="form-label">Padrões de Arquivo</label>
                                <input type="text" class="form-control" id="patterns-input" 
                                       value="*.md, *.txt, *.docx, *.pdf, *.gdoc" 
                                       placeholder="Digite extensões separadas por vírgula (ex: *.md, *.txt)">
                                <small class="form-help">Formatos suportados: .md (Obsidian), .txt, .docx, .pdf, .gdoc (Google Workspace). Personalize conforme necessário.</small>
                            </div>
                        </div>
                        
                        <h3>📁 Diretórios de Busca</h3>
                        
                        <!-- DESTACADO: Suporte ao Obsidian -->
                        <div class="form-group obsidian-highlight">
                            <div class="obsidian-support">
                                <h4 style="color: #6366f1; margin-bottom: 10px;">🎯 Detecção Automática do Obsidian</h4>
                                <button class="btn btn-primary btn-lg" onclick="callKC('WorkflowPanel.checkObsidian')" 
                                        style="background: #6366f1; border: 2px solid #4f46e5; padding: 12px 24px; font-size: 16px; font-weight: bold;">
                                    🔍 PERMITIR ACESSO - Detectar Vaults do Obsidian
                                </button>
                                <div style="margin-top: 8px; padding: 8px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                                    <small><strong>✅ SOLUÇÃO:</strong> Clique no botão acima para abrir o seletor de diretório e buscar automaticamente por estruturas do Obsidian (.obsidian/)</small>
                                </div>
                            </div>
                        </div>

                        <!-- Campo multiline para locais -->
                        <div class="form-group">
                            <label class="form-label">Locais de Busca (um por linha)</label>
                            <textarea class="form-control" id="directories-textarea" rows="4" 
                                      placeholder="/Users/[user]/Documents/Obsidian Vaults&#10;C:\\Users\\[user]\\Desktop\\Notes&#10;%USERPROFILE%\\Documents"></textarea>
                            <small class="form-help">
                                <strong>Dica:</strong> Insira caminhos absolutos, um por linha. 
                                Suporta variáveis como %USERPROFILE%, %APPDATA%, $HOME
                            </small>
                        </div>

                        <!-- Botões de ação -->
                        <div class="directory-actions">
                            <button class="btn btn-secondary" onclick="callKC('WorkflowPanel.browseDirectory')">
                                📁 Localizar Pasta
                            </button>
                            <button class="btn btn-primary" onclick="callKC('WorkflowPanel.addDirectoriesFromTextarea')">
                                ➕ Adicionar Locais
                            </button>
                            <button class="btn btn-danger" onclick="callKC('WorkflowPanel.resetDirectories')" title="Limpar todos os diretórios configurados">
                                🗑️ Reset
                            </button>
                        </div>

                        <!-- Lista de diretórios -->
                        <div class="form-group">
                            <label class="form-label">Diretórios Configurados</label>
                            <div id="directory-list" class="directory-list"></div>
                        </div>

                        <!-- Status de descoberta -->
                        <div id="discovery-status" class="discovery-status" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill" id="discovery-progress-fill"></div>
                            </div>
                            <div class="progress-text" id="discovery-progress-text">Iniciando...</div>
                            <div class="discovery-stats" id="discovery-stats"></div>
                        </div>
                    </div>
                    
                    <div class="panel-actions">
                        <button class="btn btn-primary btn-lg" id="discovery-button" onclick="callKC('WorkflowPanel.startDiscovery')">
                            🔍 Iniciar Descoberta
                        </button>
                        <button class="btn btn-danger" id="cancel-discovery" style="display: none;" onclick="callKC('WorkflowPanel.cancelDiscovery')">
                            ⏹ Cancelar
                        </button>
                    </div>
                `,
                
                preAnalysis: `
                    <h2>🧠 Extração de Insights</h2>
                    <p>Selecione o tipo de insight que você deseja extrair da sua base de conhecimento.</p>
                    
                    <div class="form-section">
                        <div class="form-group">
                            <label class="form-label" for="intent-selector">Selecione sua Intenção de Análise:</label>
                            <select class="form-control" id="intent-selector">
                                <!-- As opções serão populadas pelo IntentManager -->
                            </select>
                            <small class="form-help">Cada intenção focará a análise em diferentes aspectos do seu conhecimento.</small>
                        </div>
                    </div>
                    
                    <div class="panel-actions">
                        <button class="btn btn-secondary" onclick="callKC('AppController.previousStep')">
                            ← Voltar
                        </button>
                        <button class="btn btn-success btn-lg" onclick="callKC('WorkflowPanel.handleExtractIntent')">
                            Extrair Insights →
                        </button>
                    </div>
                `,
                
                aiAnalysis: `
                    <h2>Análise IA Seletiva</h2>
                    <p>Configure os parâmetros para análise com IA.</p>
                    
                    <!-- Botão de Configuração de APIs -->
                    <div class="api-config-banner" style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <h3 style="margin: 0 0 8px 0; color: #1e40af;">⚙️ Configuração de APIs de IA</h3>
                                <p style="margin: 0; color: #3730a3;">Configure suas API keys e escolha entre providers locais (Ollama) ou cloud (OpenAI, Gemini, Claude)</p>
                            </div>
                            <button class="btn btn-primary" onclick="KC.APIConfig.showConfigModal()" style="background: #3b82f6; min-width: 150px;">
                                🔧 Configurar APIs
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="form-group">
                            <label class="form-label">Template de Análise</label>
                            <select class="form-control" id="analysis-template">
                                <option value="decisiveMoments" selected>Momentos Decisivos</option>
                                <option value="technicalInsights">Insights Técnicos</option>
                                <option value="projectAnalysis">Análise de Projetos</option>
                            </select>
                            <small class="form-help">Cada template é otimizado para diferentes tipos de análise</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Tamanho do Batch</label>
                            <select class="form-control" id="batch-size">
                                <option value="1">1 arquivo por vez (mais lento, mais preciso)</option>
                                <option value="5" selected>5 arquivos (recomendado)</option>
                                <option value="10">10 arquivos (mais rápido)</option>
                            </select>
                            <small class="form-help">Processa múltiplos arquivos em paralelo para melhor performance</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Contexto Adicional (opcional)</label>
                            <textarea class="form-control" id="analysis-context" rows="3" 
                                      placeholder="Adicione contexto específico para guiar a análise..."></textarea>
                        </div>
                        
                        <div class="analysis-preview">
                            <h4>Arquivos para Análise</h4>
                            <div id="analysis-queue">
                                <p class="text-muted">Nenhum arquivo selecionado ainda</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="panel-actions">
                        <button class="btn btn-secondary" onclick="callKC('AppController.previousStep')">
                            Voltar
                        </button>
                        <button class="btn btn-primary" onclick="callKC('WorkflowPanel.startAnalysis')">
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
                        <button class="btn btn-secondary" onclick="callKC('AppController.previousStep')">
                            Voltar
                        </button>
                        <button class="btn btn-success btn-lg" onclick="callKC('WorkflowPanel.exportResults')">
                            Exportar Resultados
                        </button>
                    </div>
                `,
                
                dashboard: `
                    <div class="dashboard-container">
                        <h2>📊 Dashboard de Insights - Análise da Base de Conhecimento</h2>
                        <p>Visualize e explore os insights extraídos da sua base de conhecimento.</p>
                        
                        <div id="dashboard-content" class="dashboard-content">
                            <div class="loading-dashboard">
                                <div class="loading-spinner"></div>
                                <p>Carregando dashboard...</p>
                            </div>
                        </div>
                        
                        <div class="panel-actions">
                            <button class="btn btn-secondary" onclick="callKC('AppController.previousStep')">
                                Voltar
                            </button>
                            <button class="btn btn-primary" onclick="callKC('DashboardRenderer.refreshWordCloud')" title="Atualizar dashboard">
                                🔄 Atualizar Dashboard
                            </button>
                            <button class="btn btn-success btn-lg" onclick="callKC('AppController.nextStep')">
                                Próxima Etapa
                            </button>
                        </div>
                    </div>
                `
            };

            return contents[step.panel] || '<p>Painel em desenvolvimento</p>';
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
         * Manipula clique em um card de etapa
         * @param {number} stepId - ID da etapa clicada
         */
        handleStepClick(stepId) {
            const currentStep = AppState.get('currentStep');
            
            // Permite navegar apenas para etapas válidas
            if (stepId <= currentStep + 1) {
                AppController.navigateToStep(stepId);
            } else {
                KC.showNotification({
                    type: 'warning',
                    message: 'Complete as etapas anteriores primeiro'
                });
            }
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

            // Popula o seletor de intenções depois que o painel foi criado
            this.populateIntentSelector();

            // Adiciona event listeners para os elementos criados
            this.setupEventListeners();
        }

        /**
         * Configura event listeners
         * @private
         */
        setupEventListeners() {
            // Threshold range
            const thresholdRange = document.getElementById('threshold-range');
            if (thresholdRange) {
                thresholdRange.addEventListener('input', (e) => {
                    const value = e.target.value;
                    const valueDisplay = document.getElementById('threshold-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${value}%`;
                    }
                    AppState.set('configuration.preAnalysis.relevanceThreshold', parseInt(value));
                });
            }

            // Event listeners semânticos
            this.setupSemanticEventListeners();
        }

        /**
         * Configura event listeners específicos para configuração semântica
         * @private
         */
        setupSemanticEventListeners() {
            // Keywords input - atualiza preview em tempo real
            const keywordsInput = document.getElementById('keywords-input');
            if (keywordsInput) {
                keywordsInput.addEventListener('input', () => {
                    // Debounce para não atualizar muito frequentemente
                    clearTimeout(this.keywordsUpdateTimeout);
                    this.keywordsUpdateTimeout = setTimeout(() => {
                        this.updateKeywordsPreview();
                    }, 500);
                });
            }

            // Algorithm selection - atualiza preview
            const algorithmRadios = document.querySelectorAll('input[name="semantic-algorithm"]');
            algorithmRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    this.updateKeywordsPreview();
                });
            });

            // Correlation weight range
            const correlationRange = document.getElementById('correlation-weight');
            if (correlationRange) {
                correlationRange.addEventListener('input', (e) => {
                    const value = e.target.value;
                    const valueDisplay = document.getElementById('correlation-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${value}%`;
                    }
                });
            }
        }

        /**
         * Popula o seletor de intenções e adiciona o novo handler.
         * @private
         */
        populateIntentSelector() {
            const selector = document.getElementById('intent-selector');
            if (!selector) return;

            const intents = KC.IntentManager.getIntents();
            selector.innerHTML = intents.map(intent => 
                `<option value="${intent.id}">${intent.title}</option>`
            ).join('');
        }

        handleExtractIntent() {
            const selector = document.getElementById('intent-selector');
            if (!selector) return;

            const selectedIntentId = selector.value;
            KC.logger.flow('WorkflowPanel', `Usuário selecionou a intenção: ${selectedIntentId}`);

            KC.EventBus.emit(KC.Events.PROGRESS_START, { 
                type: 'insight', 
                title: 'Extraindo insights...', 
                indeterminate: true 
            });

            // Adia a extração para garantir que a UI de progresso renderize primeiro
            setTimeout(() => {
                KC.InsightExtractor.startExtraction(selectedIntentId);
            }, 100);
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

        // === Métodos de Descoberta ===

        /**
         * Verifica e carrega vaults do Obsidian
         */
        async checkObsidian() {
            KC.showNotification({
                type: 'info',
                message: 'Buscando vaults do Obsidian...'
            });

            if (KC.DiscoveryManager) {
                const vaults = await KC.DiscoveryManager.detectObsidianVaults();
                
                if (vaults && vaults.length > 0) {
                    // Adiciona vaults encontrados aos diretórios  
                    let addedCount = 0;
                    vaults.forEach(vault => {
                        // Se o vault tem handle, registra no HandleManager
                        if (vault.handle) {
                            KC.handleManager.register(vault.handle, {
                                path: vault.name,
                                name: vault.name,
                                source: 'obsidianVault',
                                vaultInfo: vault
                            });
                        }
                        
                        if (KC.DiscoveryManager.addDirectory(vault.name)) {
                            addedCount++;
                        }
                    });
                    
                    if (addedCount > 0) {
                        KC.showNotification({
                            type: 'success',
                            message: `${addedCount} vault(s) do Obsidian adicionado(s)`
                        });
                        this.updateDirectoryList();
                    } else {
                        KC.showNotification({
                            type: 'warning',
                            message: 'Vaults já estavam configurados'
                        });
                    }
                } else {
                    KC.showNotification({
                        type: 'info',
                        message: 'Nenhum vault do Obsidian encontrado'
                    });
                }
            }
        }

        /**
         * Abre seletor de diretórios usando File System Access API
         */
        async browseDirectory() {
            // Verifica compatibilidade
            if (!KC.compatibility || !KC.compatibility.isSupported()) {
                this._showUnsupportedBrowserMessage();
                return;
            }

            try {
                // Solicita acesso ao diretório
                const accessResult = await KC.compatibility.requestDirectoryAccess({
                    id: 'knowledge-directory',
                    mode: 'read',
                    startIn: 'documents'
                });

                if (!accessResult.success) {
                    if (accessResult.error !== 'cancelled') {
                        KC.showNotification({
                            type: 'error',
                            message: 'Erro ao acessar diretório: ' + accessResult.message
                        });
                    }
                    return;
                }

                // Gera preview real dos arquivos
                const preview = await this._generateRealPreview(accessResult.handle);
                
                // Mostra preview dos arquivos encontrados
                this._showDirectoryPreview(accessResult.name, preview);
                
                // Registra handle no HandleManager
                const handleId = KC.handleManager.register(accessResult.handle, {
                    path: accessResult.name, // Nome do diretório selecionado
                    name: accessResult.name,
                    source: 'browseDirectory'
                });
                
                // Auto-adiciona ao campo de texto
                this._addDirectoryToTextarea(accessResult.name);
                
            } catch (error) {
                console.error('Erro no browseDirectory:', error);
                KC.showNotification({
                    type: 'error',
                    message: 'Erro ao navegar diretórios: ' + error.message
                });
            }
        }

        /**
         * Gera preview real dos arquivos em um diretório
         * @private
         */
        async _generateRealPreview(directoryHandle) {
            const preview = {
                totalFiles: 0,
                supportedFiles: 0,
                fileTypes: {},
                totalSize: 0,
                hasObsidian: false
            };

            const supportedExtensions = ['.md', '.txt', '.docx', '.pdf'];

            try {
                for await (const entry of directoryHandle.values()) {
                    if (entry.kind === 'file') {
                        const file = await entry.getFile();
                        const extension = '.' + file.name.split('.').pop().toLowerCase();
                        
                        preview.totalFiles++;
                        
                        if (supportedExtensions.includes(extension)) {
                            preview.supportedFiles++;
                            preview.fileTypes[extension] = (preview.fileTypes[extension] || 0) + 1;
                            preview.totalSize += file.size;
                        }
                        
                    } else if (entry.kind === 'directory' && entry.name === '.obsidian') {
                        preview.hasObsidian = true;
                    }
                }
            } catch (error) {
                console.warn('Erro ao gerar preview:', error);
            }

            return preview;
        }

        /**
         * Mostra preview do diretório selecionado
         * @private
         */
        _showDirectoryPreview(directoryName, preview) {
            const typesList = Object.entries(preview.fileTypes)
                .map(([ext, count]) => `${ext} (${count})`)
                .join(', ') || 'Nenhum arquivo suportado';

            const obsidianIndicator = preview.hasObsidian ? ' 🗃️ Vault Obsidian detectado!' : '';

            KC.showNotification({
                type: 'success',
                message: `📁 Diretório analisado: ${directoryName}${obsidianIndicator}`,
                details: `${preview.supportedFiles}/${preview.totalFiles} arquivos suportados | Tipos: ${typesList} | Tamanho: ${KC.FileUtils?.formatFileSize(preview.totalSize) || 'N/A'}`,
                duration: 5000
            });
        }

        /**
         * Adiciona diretório ao campo de texto
         * @private
         */
        _addDirectoryToTextarea(directoryName) {
            const textarea = document.getElementById('directories-textarea');
            if (!textarea) return;

            const currentPaths = textarea.value.split('\n').map(p => p.trim()).filter(p => p);
            
            if (!currentPaths.includes(directoryName)) {
                if (textarea.value && !textarea.value.endsWith('\n')) {
                    textarea.value += '\n';
                }
                textarea.value += directoryName;

                KC.showNotification({
                    type: 'info',
                    message: `📝 "${directoryName}" adicionado ao campo`,
                    details: 'Clique em "Adicionar Locais" para confirmar',
                    duration: 3000
                });
            } else {
                KC.showNotification({
                    type: 'warning',
                    message: 'Diretório já está na lista',
                    duration: 2000
                });
            }
        }

        /**
         * Mostra mensagem para navegadores não suportados
         * @private
         */
        _showUnsupportedBrowserMessage() {
            KC.showNotification({
                type: 'warning',
                message: 'Navegador não suporta acesso direto a diretórios',
                details: 'Use Chrome/Edge 86+ ou adicione caminhos manualmente',
                duration: 4000
            });

            // Mostra modal de compatibilidade se disponível
            if (KC.compatibility) {
                KC.compatibility.showCompatibilityModal();
            }
        }

        /**
         * Manipula seleção de diretórios
         * @private
         */
        handleDirectorySelection(event) {
            const files = event.target.files;
            if (files.length > 0) {
                // Mostra preview dos arquivos encontrados
                this._showFilePreview(files);
                
                // Obtém o caminho do diretório do primeiro arquivo
                const firstFile = files[0];
                if (firstFile.webkitRelativePath) {
                    const pathParts = firstFile.webkitRelativePath.split('/');
                    if (pathParts.length > 1) {
                        const directory = pathParts[0];
                        
                        // Auto-adiciona ao campo de texto
                        const textarea = document.getElementById('directories-textarea');
                        if (textarea) {
                            const currentPaths = textarea.value.split('\n').map(p => p.trim()).filter(p => p);
                            if (!currentPaths.includes(directory)) {
                                if (textarea.value && !textarea.value.endsWith('\n')) {
                                    textarea.value += '\n';
                                }
                                textarea.value += directory;
                                
                                KC.showNotification({
                                    type: 'info',
                                    message: `Pasta "${directory}" adicionada. Clique em "Adicionar Locais" para confirmar.`
                                });
                            }
                        }
                    }
                }
            }
        }

        /**
         * Mostra preview dos arquivos encontrados
         * @private
         */
        _showFilePreview(files) {
            const fileTypes = {};
            const totalFiles = files.length;
            
            // Agrupa por tipo
            Array.from(files).forEach(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                fileTypes[ext] = (fileTypes[ext] || 0) + 1;
            });
            
            const typesList = Object.entries(fileTypes)
                .map(([ext, count]) => `${ext} (${count})`)
                .join(', ');
            
            KC.showNotification({
                type: 'success',
                message: `Pasta analisada: ${totalFiles} arquivos encontrados`,
                details: `Tipos: ${typesList}`,
                duration: 4000
            });
        }

        /**
         * Adiciona diretórios do textarea
         */
        addDirectoriesFromTextarea() {
            const textarea = document.getElementById('directories-textarea');
            if (!textarea) return;

            const lines = textarea.value.split('\n').filter(line => line.trim());
            let addedCount = 0;
            let expandedCount = 0;

            lines.forEach(line => {
                let dir = line.trim();
                
                // Expande variáveis de ambiente básicas
                const originalDir = dir;
                dir = this._expandEnvironmentVariables(dir);
                
                if (dir !== originalDir) {
                    expandedCount++;
                }
                
                if (dir && KC.DiscoveryManager) {
                    if (KC.DiscoveryManager.addDirectory(dir)) {
                        addedCount++;
                    }
                }
            });

            if (addedCount > 0) {
                let message = `${addedCount} diretório(s) adicionado(s)`;
                if (expandedCount > 0) {
                    message += ` (${expandedCount} variável(eis) expandida(s))`;
                }
                
                KC.showNotification({
                    type: 'success',
                    message: message
                });
                textarea.value = '';
                this.updateDirectoryList();
                
                // Informa sobre a necessidade de usar "Localizar Pasta" para dados reais
                if (KC.compatibility && KC.compatibility.isSupported()) {
                    KC.showNotification({
                        type: 'info',
                        message: 'Para escanear arquivos reais, use o botão "Localizar Pasta"',
                        duration: 5000
                    });
                }
            } else {
                KC.showNotification({
                    type: 'warning',
                    message: 'Nenhum diretório novo foi adicionado'
                });
            }
        }

        /**
         * Expande variáveis de ambiente básicas
         * @private
         */
        _expandEnvironmentVariables(path) {
            // Simulação básica de expansão de variáveis
            const platform = navigator.platform || '';
            const isWindows = platform.toLowerCase().includes('win');
            
            if (isWindows) {
                // Variáveis Windows
                path = path.replace(/%USERPROFILE%/gi, 'C:\\Users\\demo');
                path = path.replace(/%APPDATA%/gi, 'C:\\Users\\demo\\AppData\\Roaming');
                path = path.replace(/%LOCALAPPDATA%/gi, 'C:\\Users\\demo\\AppData\\Local');
                path = path.replace(/%DOCUMENTS%/gi, 'C:\\Users\\demo\\Documents');
            } else {
                // Variáveis Unix/Mac
                path = path.replace(/\$HOME/g, '/Users/demo');
                path = path.replace(/~/g, '/Users/demo');
                path = path.replace(/\$USER/g, 'demo');
            }
            
            return path;
        }

        /**
         * Remove diretório da lista
         */
        removeDirectory(dir) {
            if (KC.DiscoveryManager && KC.DiscoveryManager.removeDirectory(dir)) {
                this.updateDirectoryList();
                KC.showNotification({
                    type: 'success',
                    message: 'Diretório removido'
                });
            }
        }

        /**
         * Remove diretório por índice (evita problemas de escaping)
         */
        removeDirectoryByIndex(index) {
            const directories = AppState.get('configuration.discovery.directories') || [];
            if (index >= 0 && index < directories.length) {
                const removedDir = directories[index];
                if (KC.DiscoveryManager && KC.DiscoveryManager.removeDirectory(removedDir)) {
                    this.updateDirectoryList();
                    KC.showNotification({
                        type: 'success',
                        message: 'Diretório removido'
                    });
                }
            }
        }

        /**
         * Reseta todos os diretórios configurados
         */
        resetDirectories() {
            if (KC.DiscoveryManager) {
                const confirmed = confirm('Tem certeza que deseja limpar todos os diretórios? Esta ação não pode ser desfeita.');
                if (confirmed) {
                    KC.DiscoveryManager.clearAllDirectories();
                    KC.handleManager.clear();
                    
                    // LIMPA TAMBÉM OS ARQUIVOS DESCOBERTOS
                    AppState.set('files', []);
                    if (KC.FileRenderer) {
                        KC.FileRenderer.files = [];
                        KC.FileRenderer.renderFileList();
                    }
                    
                    // LIMPA ESTADO DE DUPLICATAS
                    AppState.set('stats.duplicateStats', null);
                    
                    // LIMPA FILTROS DE DUPLICATAS
                    if (KC.FilterPanel) {
                        KC.FilterPanel.duplicateFilterState = null;
                        // Força re-renderização para remover seção de duplicatas
                        if (KC.FilterPanel.container) {
                            KC.FilterPanel.renderIntuitiveInterface();
                            KC.FilterPanel.setupEventListeners();
                        }
                        
                        // Remove seção de duplicatas do DOM como fallback
                        const duplicateSection = document.querySelector('[data-group="duplicates"]');
                        if (duplicateSection) {
                            duplicateSection.remove();
                        }
                    }
                    
                    this.updateDirectoryList();
                    KC.showNotification({
                        type: 'success',
                        message: 'Todos os diretórios e arquivos foram removidos'
                    });
                }
            }
        }

        /**
         * Atualiza lista visual de diretórios
         */
        updateDirectoryList() {
            const list = document.getElementById('directory-list');
            if (!list) return;

            const directories = AppState.get('configuration.discovery.directories') || [];
            
            list.innerHTML = '';
            
            if (directories.length === 0) {
                list.innerHTML = '<p class="text-muted">Nenhum diretório configurado</p>';
                return;
            }

            directories.forEach((dir, index) => {
                const item = document.createElement('div');
                item.className = 'directory-item';
                item.innerHTML = `
                    <span class="directory-path">${dir}</span>
                    <button class="btn-remove" onclick="callKC('WorkflowPanel.removeDirectoryByIndex', ${index})">×</button>
                `;
                list.appendChild(item);
            });
        }

        /**
         * Carrega diretórios salvos
         */
        loadSavedDirectories() {
            this.updateDirectoryList();
            
            // Atualiza outros campos
            const timeRange = AppState.get('configuration.discovery.timeRange');
            if (timeRange) {
                const select = document.getElementById('time-range');
                if (select) select.value = timeRange;
            }

            const subfolderDepth = AppState.get('configuration.discovery.subfolderDepth');
            if (subfolderDepth !== undefined) {
                const select = document.getElementById('subfolder-depth');
                if (select) select.value = subfolderDepth;
            }

            const minFileSize = AppState.get('configuration.discovery.minFileSize');
            if (minFileSize !== undefined) {
                const select = document.getElementById('min-file-size');
                if (select) select.value = minFileSize;
            }
        }

        /**
         * Atualiza configuração de período
         */
        updateTimeRange() {
            const select = document.getElementById('time-range');
            if (select) {
                AppState.set('configuration.discovery.timeRange', select.value);
            }
        }

        /**
         * Atualiza configuração de profundidade
         */
        updateSubfolderDepth() {
            const select = document.getElementById('subfolder-depth');
            if (select) {
                AppState.set('configuration.discovery.subfolderDepth', parseInt(select.value));
            }
        }

        /**
         * Atualiza tamanho mínimo de arquivo
         */
        updateMinFileSize() {
            const select = document.getElementById('min-file-size');
            if (select) {
                AppState.set('configuration.discovery.minFileSize', parseInt(select.value));
            }
        }

        /**
         * Inicia processo de descoberta
         */
        async startDiscovery() {
            const directories = AppState.get('configuration.discovery.directories') || [];
            
            if (directories.length === 0) {
                KC.showNotification({
                    type: 'error',
                    message: 'Adicione pelo menos um diretório para busca'
                });
                return;
            }

            // Salva configurações antes de iniciar
            const subfolderSelect = document.getElementById('subfolder-depth');
            if (subfolderSelect) {
                AppState.set('configuration.discovery.subfolderDepth', parseInt(subfolderSelect.value));
            }

            if (KC.DiscoveryManager) {
                const result = await KC.DiscoveryManager.startDiscovery();
                
                if (result.success) {
                    KC.showNotification({
                        type: 'success',
                        message: `Descoberta concluída: ${result.stats.matchedFiles} arquivos encontrados`
                    });
                    
                    // Avança para próxima etapa se encontrou arquivos
                    if (result.stats.matchedFiles > 0) {
                        setTimeout(() => AppController.nextStep(), 1500);
                    }
                }
            }
        }

        /**
         * Cancela descoberta em andamento
         */
        cancelDiscovery() {
            if (KC.DiscoveryManager) {
                KC.DiscoveryManager.stopDiscovery();
            }
        }

        /**
         * Atualiza UI durante descoberta
         * @private
         */
        updateDiscoveryUI(inProgress) {
            const button = document.getElementById('discovery-button');
            const cancelButton = document.getElementById('cancel-discovery');
            const status = document.getElementById('discovery-status');
            
            if (button) {
                button.disabled = inProgress;
                button.textContent = inProgress ? '⏳ Descobrindo...' : '🔍 Iniciar Descoberta';
            }
            if (cancelButton) cancelButton.style.display = inProgress ? 'inline-block' : 'none';
            
            // Mantém status visível após descoberta para mostrar resultados
            if (status) {
                status.style.display = 'block';
                if (!inProgress) {
                    // Adiciona classe para indicar conclusão
                    status.classList.add('discovery-completed');
                } else {
                    status.classList.remove('discovery-completed');
                }
            }
        }

        /**
         * Atualiza progresso da descoberta
         * @private
         */
        updateDiscoveryProgress(data) {
            const progressFill = document.getElementById('discovery-progress-fill');
            const progressText = document.getElementById('discovery-progress-text');
            const detailsDiv = document.getElementById('discovery-details');
            
            if (progressFill && data.total > 0) {
                const percentage = (data.current / data.total) * 100;
                progressFill.style.width = `${percentage}%`;
            }
            
            if (progressText) {
                progressText.innerHTML = `
                    <div class="progress-main">${data.message || 'Processando...'}</div>
                    ${data.details ? `<div class="progress-details">${data.details}</div>` : ''}
                `;
            }
        }

        /**
         * Atualiza resultados da descoberta
         * @private
         */
        updateDiscoveryResults(data) {
            const statsDiv = document.getElementById('discovery-stats');
            if (statsDiv && data.stats) {
                const stats = data.stats;
                const duration = stats.endTime && stats.startTime ? 
                    ((stats.endTime - stats.startTime) / 1000).toFixed(1) : '0';
                
                statsDiv.innerHTML = `
                    <div class="stat-row">
                        <span>Diretórios escaneados:</span> <strong>${stats.scannedDirectories}</strong>
                    </div>
                    <div class="stat-row">
                        <span>Total de arquivos:</span> <strong>${stats.totalFiles}</strong>
                    </div>
                    <div class="stat-row">
                        <span>Arquivos válidos:</span> <strong>${stats.matchedFiles}</strong>
                    </div>
                    <div class="stat-row">
                        <span>Arquivos ignorados:</span> <strong>${stats.skippedFiles}</strong>
                    </div>
                    <div class="stat-row">
                        <span>Tempo decorrido:</span> <strong>${duration}s</strong>
                    </div>
                `;
            }

            // Atualiza resumo na etapa 2
            const summaryDiv = document.getElementById('files-summary-content');
            if (summaryDiv && data.files) {
                const totalSize = data.files.reduce((sum, file) => sum + (file.size || 0), 0);
                const avgSize = data.files.length > 0 ? totalSize / data.files.length : 0;
                
                summaryDiv.innerHTML = `
                    <div class="summary-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total de Arquivos:</span>
                            <span class="stat-value">${data.files.length}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Tamanho Total:</span>
                            <span class="stat-value">${FileUtils.formatFileSize(totalSize)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Tamanho Médio:</span>
                            <span class="stat-value">${FileUtils.formatFileSize(avgSize)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Tipos de Arquivo:</span>
                            <span class="stat-value">${this.getFileTypesBreakdown(data.files)}</span>
                        </div>
                    </div>
                `;
            }
        }

        /**
         * Obtém breakdown de tipos de arquivo
         * @private
         */
        getFileTypesBreakdown(files) {
            const types = {};
            files.forEach(file => {
                const ext = file.extension || 'unknown';
                types[ext] = (types[ext] || 0) + 1;
            });
            
            return Object.entries(types)
                .map(([ext, count]) => `${ext} (${count})`)
                .join(', ');
        }

        // === Métodos de Configuração Semântica ===

        /**
         * Alterna exibição da ajuda semântica
         */
        toggleSemanticHelp() {
            const helpDiv = document.getElementById('semantic-help');
            if (helpDiv) {
                const isVisible = helpDiv.style.display !== 'none';
                helpDiv.style.display = isVisible ? 'none' : 'block';
                
                const button = document.querySelector('.help-toggle');
                if (button) {
                    button.textContent = isVisible ? '❓' : '❌';
                    button.title = isVisible ? 'Ver ajuda detalhada' : 'Fechar ajuda';
                }
            }
        }

        /**
         * Alterna configurações avançadas
         */
        toggleAdvancedSemantic() {
            const advancedDiv = document.getElementById('advanced-semantic-config');
            const button = document.querySelector('.advanced-toggle');
            
            if (advancedDiv) {
                const isVisible = advancedDiv.style.display !== 'none';
                advancedDiv.style.display = isVisible ? 'none' : 'block';
                
                if (button) {
                    button.textContent = isVisible ? '⚙️ Configurações Avançadas' : '⚙️ Ocultar Avançadas';
                }
            }
        }

        /**
         * Atualiza threshold semântico
         */
        updateSemanticThreshold() {
            const thresholdRange = document.getElementById('threshold-range');
            const thresholdValue = document.getElementById('threshold-value');
            const thresholdDescription = document.getElementById('threshold-description');
            const previewImpact = document.getElementById('semantic-preview-impact');
            
            if (thresholdRange && thresholdValue) {
                const value = parseInt(thresholdRange.value);
                
                // Descrições para cada threshold
                const descriptions = {
                    30: 'Máxima Cobertura',
                    40: 'Cobertura Ampla',
                    50: 'Balanceado',
                    60: 'Seletivo',
                    70: 'Alta Precisão',
                    80: 'Muito Seletivo',
                    90: 'Apenas Críticos'
                };
                
                const desc = descriptions[value] || 'Personalizado';
                thresholdValue.textContent = `${value}% - ${desc}`;
                if (thresholdDescription) {
                    thresholdDescription.textContent = desc;
                }
                
                // Atualiza preview do impacto
                if (previewImpact) {
                    const impact = this.calculateSemanticImpact(value);
                    previewImpact.innerHTML = `
                        <small class="semantic-impact-preview">
                            📊 Impacto estimado: <strong>${impact.expectedFiles}</strong> arquivos candidatos 
                            (${impact.percentage}% da descoberta atual)
                        </small>
                    `;
                }
                
                // Salva no estado
                AppState.set('configuration.preAnalysis.relevanceThreshold', value);
            }
        }

        /**
         * Calcula impacto semântico estimado
         * @private
         */
        calculateSemanticImpact(threshold) {
            const discoveredFiles = AppState.get('files') || [];
            const totalFiles = discoveredFiles.length;
            
            // Algoritmo simplificado para estimativa
            let estimatedPercentage;
            if (threshold <= 30) estimatedPercentage = 0.85;
            else if (threshold <= 50) estimatedPercentage = 0.65;
            else if (threshold <= 70) estimatedPercentage = 0.35;
            else estimatedPercentage = 0.15;
            
            const expectedFiles = Math.round(totalFiles * estimatedPercentage);
            const percentage = totalFiles > 0 ? Math.round((expectedFiles / totalFiles) * 100) : 0;
            
            return { expectedFiles, percentage };
        }

        /**
         * Atualiza configurações de preview
         */
        updatePreviewSettings() {
            const previewEnabled = document.getElementById('preview-enabled');
            const previewDetails = document.getElementById('preview-details');
            
            if (previewEnabled && previewDetails) {
                const isEnabled = previewEnabled.checked;
                previewDetails.style.display = isEnabled ? 'block' : 'none';
                
                AppState.set('configuration.preAnalysis.previewEnabled', isEnabled);
                
                KC.showNotification({
                    type: 'info',
                    message: isEnabled ? 
                        'Preview Inteligente ativado - economia de 70% tokens' : 
                        'Preview Inteligente desativado',
                    duration: 2000
                });
            }
        }

        /**
         * Testa preview semântico com configurações atuais
         */
        testSemanticPreview() {
            const keywords = this.getSemanticKeywords();
            const algorithm = this.getSelectedAlgorithm();
            const threshold = document.getElementById('threshold-range')?.value || 50;
            
            if (keywords.length === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Adicione pelo menos uma keyword personalizada para testar'
                });
                return;
            }
            
            // Simula teste com primeiro arquivo descoberto
            const files = AppState.get('files') || [];
            if (files.length === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Execute a descoberta de arquivos primeiro'
                });
                return;
            }
            
            const sampleFile = files[0];
            const mockScore = this.calculateMockSemanticScore(sampleFile, keywords, algorithm);
            
            KC.showNotification({
                type: 'success',
                message: 'Teste de Preview Semântico',
                details: `Arquivo: ${sampleFile.name} | Score: ${mockScore}% | Algoritmo: ${algorithm} | Keywords: ${keywords.length}`,
                duration: 5000
            });
            
            // Mostra preview das keywords combinadas
            this.updateKeywordsPreview();
        }

        /**
         * Calcula score semântico mockado para teste
         * @private
         */
        calculateMockSemanticScore(file, keywords, algorithm) {
            // Simulação básica para demonstração
            const baseScore = Math.random() * 50 + 25; // 25-75%
            
            // Aplica modificadores baseados no algoritmo
            let modifier = 1;
            switch (algorithm) {
                case 'exponential':
                    modifier = 1.3;
                    break;
                case 'logarithmic':
                    modifier = 0.9;
                    break;
                default: // linear
                    modifier = 1;
            }
            
            // Bonus por número de keywords
            const keywordBonus = Math.min(keywords.length * 2, 15);
            
            return Math.round(Math.min((baseScore * modifier) + keywordBonus, 95));
        }

        /**
         * Obtém keywords semânticas configuradas
         * @private
         */
        getSemanticKeywords() {
            const keywordsInput = document.getElementById('keywords-input');
            if (!keywordsInput) return [];
            
            const baseKeywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
            const customKeywords = keywordsInput.value
                .split(/[,\n]/)
                .map(k => k.trim())
                .filter(k => k.length > 0);
            
            return [...baseKeywords, ...customKeywords];
        }

        /**
         * Obtém algoritmo selecionado
         * @private
         */
        getSelectedAlgorithm() {
            const radios = document.querySelectorAll('input[name="semantic-algorithm"]');
            for (const radio of radios) {
                if (radio.checked) {
                    return radio.value;
                }
            }
            return 'linear'; // padrão
        }

        /**
         * Atualiza preview das keywords combinadas
         */
        updateKeywordsPreview() {
            const previewDiv = document.getElementById('keywords-preview');
            const combinedDisplay = document.getElementById('keywords-combined-display');
            const impactDiv = document.getElementById('semantic-impact');
            
            if (!previewDiv || !combinedDisplay) return;
            
            const keywords = this.getSemanticKeywords();
            const algorithm = this.getSelectedAlgorithm();
            
            if (keywords.length > 5) { // Mostra preview se há keywords customizadas
                previewDiv.style.display = 'block';
                
                // Mostra keywords combinadas
                combinedDisplay.innerHTML = keywords.map((keyword, index) => {
                    const isBase = index < 5;
                    return `<span class="keyword-pill ${isBase ? 'base' : 'custom'}">${keyword}</span>`;
                }).join('');
                
                // Mostra impacto semântico
                if (impactDiv) {
                    const totalKeywords = keywords.length;
                    const customKeywords = totalKeywords - 5;
                    
                    impactDiv.innerHTML = `
                        <div class="semantic-stats">
                            <div class="stat">Total: <strong>${totalKeywords}</strong> keywords</div>
                            <div class="stat">Personalizadas: <strong>${customKeywords}</strong></div>
                            <div class="stat">Algoritmo: <strong>${algorithm}</strong></div>
                        </div>
                    `;
                }
            } else {
                previewDiv.style.display = 'none';
            }
        }

        /**
         * Aplica filtros semânticos
         */
        applySemanticFilters() {
            // Coleta todas as configurações semânticas
            const keywords = this.getSemanticKeywords();
            const algorithm = this.getSelectedAlgorithm();
            const threshold = parseInt(document.getElementById('threshold-range')?.value || 50);
            const previewEnabled = document.getElementById('preview-enabled')?.checked || false;
            
            // Configurações avançadas
            const contextWindow = parseInt(document.getElementById('context-window')?.value || 25);
            const correlationWeight = parseInt(document.getElementById('correlation-weight')?.value || 30);
            
            // Valida configurações
            if (keywords.length <= 5) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Adicione pelo menos uma keyword personalizada para análise semântica efetiva'
                });
                return;
            }
            
            // Salva configuração completa no estado
            const semanticConfig = {
                keywords: keywords,
                algorithm: algorithm,
                threshold: threshold,
                previewEnabled: previewEnabled,
                contextWindow: contextWindow,
                correlationWeight: correlationWeight,
                timestamp: new Date().toISOString()
            };
            
            AppState.set('configuration.preAnalysis.semanticConfig', semanticConfig);
            AppState.set('configuration.preAnalysis.keywords', keywords);
            AppState.set('configuration.preAnalysis.relevanceThreshold', threshold);
            AppState.set('configuration.preAnalysis.previewEnabled', previewEnabled);
            
            KC.showNotification({
                type: 'success',
                message: '🧠 Análise Semântica Configurada',
                details: `${keywords.length} keywords, algoritmo ${algorithm}, threshold ${threshold}%`,
                duration: 4000
            });
            
            // Atualiza preview uma última vez
            this.updateKeywordsPreview();
            
            // FORÇA carregamento da lista de arquivos
            setTimeout(() => {
                if (KC.FileRenderer && typeof KC.FileRenderer.forceLoad === 'function') {
                    console.log('WorkflowPanel: Forçando carregamento da lista de arquivos...');
                    KC.FileRenderer.forceLoad();
                }
            }, 500);
            
            // NÃO avança automaticamente - deixa usuário ver a lista
            // setTimeout(() => {
            //     AppController.nextStep();
            // }, 1500);
        }

        /**
         * Aplica filtros de pré-análise (método legado mantido para compatibilidade)
         */
        applyFilters() {
            // Redireciona para o novo método semântico
            this.applySemanticFilters();
        }

        /**
         * Inicia análise IA
         */
        startAnalysis() {
            KC.showNotification({
                type: 'info',
                message: 'Análise IA será implementada em breve'
            });
            AppController.nextStep();
        }

        /**
         * Exporta resultados
         */
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

    // Expõe métodos necessários para onclick handlers
    // Estes métodos precisam estar disponíveis globalmente
    KC.WorkflowPanel.checkObsidian = workflowPanel.checkObsidian.bind(workflowPanel);
    KC.WorkflowPanel.browseDirectory = workflowPanel.browseDirectory.bind(workflowPanel);
    KC.WorkflowPanel.addDirectoriesFromTextarea = workflowPanel.addDirectoriesFromTextarea.bind(workflowPanel);
    KC.WorkflowPanel.removeDirectory = workflowPanel.removeDirectory.bind(workflowPanel);
    KC.WorkflowPanel.removeDirectoryByIndex = workflowPanel.removeDirectoryByIndex.bind(workflowPanel);
    KC.WorkflowPanel.resetDirectories = workflowPanel.resetDirectories.bind(workflowPanel);
    KC.WorkflowPanel.updateTimeRange = workflowPanel.updateTimeRange.bind(workflowPanel);
    KC.WorkflowPanel.updateMinFileSize = workflowPanel.updateMinFileSize.bind(workflowPanel);
    KC.WorkflowPanel.startDiscovery = workflowPanel.startDiscovery.bind(workflowPanel);
    KC.WorkflowPanel.cancelDiscovery = workflowPanel.cancelDiscovery.bind(workflowPanel);
    KC.WorkflowPanel.applyFilters = workflowPanel.applyFilters.bind(workflowPanel);
    KC.WorkflowPanel.startAnalysis = workflowPanel.startAnalysis.bind(workflowPanel);
    KC.WorkflowPanel.exportResults = workflowPanel.exportResults.bind(workflowPanel);
    
    // Métodos de Configuração Semântica
    KC.WorkflowPanel.toggleSemanticHelp = workflowPanel.toggleSemanticHelp.bind(workflowPanel);
    KC.WorkflowPanel.toggleAdvancedSemantic = workflowPanel.toggleAdvancedSemantic.bind(workflowPanel);
    KC.WorkflowPanel.updateSemanticThreshold = workflowPanel.updateSemanticThreshold.bind(workflowPanel);
    KC.WorkflowPanel.updatePreviewSettings = workflowPanel.updatePreviewSettings.bind(workflowPanel);
    KC.WorkflowPanel.testSemanticPreview = workflowPanel.testSemanticPreview.bind(workflowPanel);
    KC.WorkflowPanel.applySemanticFilters = workflowPanel.applySemanticFilters.bind(workflowPanel);

})(window);
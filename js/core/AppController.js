/**
 * AppController.js - Controlador Principal da Aplicação
 * 
 * Orquestra a inicialização de módulos, navegação entre etapas
 * e gerencia o ciclo de vida da aplicação
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class AppController {
        constructor() {
            this.initialized = false;
            this.modules = new Map();
            this.currentPanel = null;
            this.validators = new Map();
            
            // Configuração das etapas
            this.steps = [
                {
                    id: 1,
                    name: 'Descoberta Automática',
                    icon: '🔍',
                    description: 'Configure padrões e diretórios para busca',
                    panel: 'discovery',
                    validator: 'validateDiscoveryConfig'
                },
                {
                    id: 2,
                    name: 'Pré-Análise Local',
                    icon: '🎯',
                    description: 'Defina filtros e relevância',
                    panel: 'preAnalysis',
                    validator: 'validatePreAnalysisConfig'
                },
                {
                    id: 3,
                    name: 'Análise IA Seletiva',
                    icon: '🤖',
                    description: 'Configure modelos e parâmetros de IA',
                    panel: 'aiAnalysis',
                    validator: 'validateAIConfig'
                },
                // ORIGINAL - Preservado para rollback
                // {
                //     id: 3,
                //     name: 'Dashboard de Insights',
                //     icon: '✨',
                //     description: 'Explore os insights extraídos da sua base de conhecimento.',
                //     panel: 'dashboard',
                //     validator: null
                // },
                {
                    id: 4,
                    name: 'Organização Inteligente',
                    icon: '📊',
                    description: 'Categorize e exporte resultados',
                    panel: 'organization',
                    validator: 'validateOrganizationConfig'
                }
            ];
        }

        /**
         * Inicializa o controlador e todos os módulos
         */
        async initialize() {
            if (this.initialized) return;

            try {
                // Marca início da inicialização
                AppState.set('ui.loading', true);
                AppState.set('ui.loadingMessage', 'Inicializando aplicação...');

                // Registra event listeners principais
                this._setupEventListeners();

                // Inicializa validadores
                this._setupValidators();

                // Renderiza interface inicial
                await this._renderInitialUI();

                // Inicializa módulos registrados
                await this._initializeModules();

                // Restaura estado da navegação
                const currentStep = AppState.get('currentStep') || 1;
                await this.navigateToStep(currentStep);

                // Marca como inicializado
                this.initialized = true;
                AppState.set('ui.loading', false);
                
                EventBus.emit(Events.APP_INITIALIZED);
                
                console.log('Knowledge Consolidator inicializado com sucesso');
            } catch (error) {
                console.error('Erro na inicialização:', error);
                EventBus.emit(Events.ERROR_OCCURRED, {
                    type: 'initialization',
                    error: error.message
                });
                
                AppState.set('ui.loading', false);
                throw error;
            }
        }

        /**
         * Registra um módulo no controlador
         * @param {string} name - Nome do módulo
         * @param {Object} module - Instância do módulo
         */
        registerModule(name, module) {
            if (this.modules.has(name)) {
                console.warn(`Módulo ${name} já registrado`);
                return;
            }

            this.modules.set(name, module);
            
            // Se já inicializado, inicializa o módulo imediatamente
            if (this.initialized && module.initialize) {
                module.initialize();
            }
        }

        /**
         * Obtém um módulo registrado
         * @param {string} name - Nome do módulo
         * @returns {Object} Módulo
         */
        getModule(name) {
            return this.modules.get(name);
        }

        /**
         * Navega para uma etapa específica
         * @param {number} stepNumber - Número da etapa (1-4)
         */
        async navigateToStep(stepNumber) {
            const currentStep = AppState.get('currentStep');
            
            // Valida número da etapa
            if (stepNumber < 1 || stepNumber > 4) {
                console.error('Etapa inválida:', stepNumber);
                return;
            }

            // Valida se pode navegar (etapas anteriores devem estar completas)
            if (stepNumber > 1 && !this._canNavigateToStep(stepNumber)) {
                EventBus.emit(Events.ERROR_OCCURRED, {
                    type: 'navigation',
                    message: 'Complete as etapas anteriores primeiro'
                });
                return;
            }

            // Salva estado atual se mudando de etapa
            if (currentStep !== stepNumber) {
                AppState.set('currentStep', stepNumber);
                EventBus.emit(Events.STEP_CHANGED, { 
                    from: currentStep, 
                    to: stepNumber 
                });
            }

            // Mostra painel correspondente
            const step = this.steps[stepNumber - 1];
            await this.showPanel(step.panel);
            
            // Atualiza UI
            this._updateWorkflowUI(stepNumber);
            this._updateNavigationStatus(stepNumber);
        }

        /**
         * Mostra um painel específico
         * @param {string} panelName - Nome do painel
         */
        async showPanel(panelName) {
            if (this.currentPanel === panelName) return;

            // Esconde painel atual
            if (this.currentPanel) {
                this._hidePanel(this.currentPanel);
            }

            // Mostra novo painel
            this.currentPanel = panelName;
            this._showPanel(panelName);

            EventBus.emit(Events.PANEL_CHANGED, {
                from: this.currentPanel,
                to: panelName
            });

            // Atualiza visibilidade de seções
            this._updateSectionVisibility(panelName);
        }

        /**
         * Valida configuração da etapa atual
         * @returns {boolean} True se válida
         */
        validateCurrentStep() {
            const currentStep = AppState.get('currentStep');
            const step = this.steps[currentStep - 1];
            
            if (!step.validator) return true;
            
            const validator = this.validators.get(step.validator);
            if (!validator) return true;
            
            return validator();
        }

        /**
         * Avança para próxima etapa
         */
        async nextStep() {
            const currentStep = AppState.get('currentStep');
            
            // Valida etapa atual
            if (!this.validateCurrentStep()) {
                EventBus.emit(Events.ERROR_OCCURRED, {
                    type: 'validation',
                    message: 'Corrija os erros antes de continuar'
                });
                return;
            }

            // Avança se possível
            if (currentStep < 4) {
                await this.navigateToStep(currentStep + 1);
            }
        }

        /**
         * Volta para etapa anterior
         */
        async previousStep() {
            const currentStep = AppState.get('currentStep');
            
            if (currentStep > 1) {
                await this.navigateToStep(currentStep - 1);
            }
        }

        /**
         * Configura event listeners principais
         * @private
         */
        _setupEventListeners() {
            // Navegação por teclado
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        this.nextStep();
                    } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        this.previousStep();
                    }
                }
            });

            // Mudanças de estado que afetam UI
            EventBus.on(Events.STATE_CHANGED, (data) => {
                if (data.path && data.path.startsWith('stats.')) {
                    this._updateStats();
                }
            });

            // Erros globais
            window.addEventListener('error', (event) => {
                console.error('Erro global:', event.error);
                EventBus.emit(Events.ERROR_OCCURRED, {
                    type: 'global',
                    error: event.error?.message || 'Erro desconhecido'
                });
            });

            // Previne saída acidental com mudanças não salvas
            window.addEventListener('beforeunload', (e) => {
                const hasUnsavedChanges = AppState.get('ui.hasUnsavedChanges');
                if (hasUnsavedChanges) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            });
        }

        /**
         * Configura validadores de etapas
         * @private
         */
        _setupValidators() {
            // Validador Etapa 1 - Descoberta
            this.validators.set('validateDiscoveryConfig', () => {
                const config = AppState.get('configuration.discovery');
                
                if (!config.directories || config.directories.length === 0) {
                    this._showValidationError('Selecione pelo menos um diretório');
                    return false;
                }
                
                if (!config.filePatterns || config.filePatterns.length === 0) {
                    this._showValidationError('Defina pelo menos um padrão de arquivo');
                    return false;
                }
                
                return true;
            });

            // Validador Etapa 2 - Pré-Análise
            this.validators.set('validatePreAnalysisConfig', () => {
                const config = AppState.get('configuration.preAnalysis');
                
                if (!config.keywords || config.keywords.length === 0) {
                    this._showValidationError('Defina pelo menos uma palavra-chave');
                    return false;
                }
                
                if (config.relevanceThreshold < 0 || config.relevanceThreshold > 100) {
                    this._showValidationError('Threshold deve estar entre 0 e 100');
                    return false;
                }
                
                return true;
            });

            // Validador Etapa 3 - Análise IA
            this.validators.set('validateAIConfig', () => {
                const config = AppState.get('configuration.aiAnalysis');
                const files = AppState.get('files');
                
                if (!files || files.length === 0) {
                    this._showValidationError('Nenhum arquivo para analisar');
                    return false;
                }
                
                return true;
            });

            // Validador Etapa 4 - Organização
            this.validators.set('validateOrganizationConfig', () => {
                const config = AppState.get('configuration.organization');
                
                if (!config.exportFormats || config.exportFormats.length === 0) {
                    this._showValidationError('Selecione pelo menos um formato de exportação');
                    return false;
                }
                
                return true;
            });
        }

        /**
         * Renderiza UI inicial
         * @private
         */
        async _renderInitialUI() {
            // Renderiza workflow cards se o componente estiver disponível
            const WorkflowPanel = this.getModule('WorkflowPanel');
            if (WorkflowPanel && WorkflowPanel.render) {
                await WorkflowPanel.render(this.steps);
            }
        }

        /**
         * Inicializa módulos registrados
         * @private
         */
        async _initializeModules() {
            // ORIGINAL - Preservado para rollback
            // for (const [name, module] of this.modules) {
            //     if (module.initialize && typeof module.initialize === 'function') {
            //         try {
            //             await module.initialize();
            //         } catch (error) {
            //             console.error(`Erro ao inicializar módulo ${name}:`, error);
            //         }
            //     }
            // }
            
            // NOVO: Inicialização com tratamento especial para FileRenderer
            for (const [name, module] of this.modules) {
                if (module.initialize && typeof module.initialize === 'function') {
                    try {
                        await module.initialize();
                        
                        // Tratamento especial para FileRenderer
                        if (name === 'FileRenderer' && module.setContainer) {
                            console.log('[DEBUG] AppController: Configurando container do FileRenderer');
                            module.setContainer('files-container');
                        }
                    } catch (error) {
                        console.error(`Erro ao inicializar módulo ${name}:`, error);
                    }
                }
            }
            
            // Inicializar pipeline de enriquecimento de inteligência
            if (KC.IntelligenceEnrichmentPipeline && KC.IntelligenceEnrichmentPipeline.initialize) {
                try {
                    console.log('[INFO] AppController: Inicializando Intelligence Enrichment Pipeline...');
                    await KC.IntelligenceEnrichmentPipeline.initialize();
                    console.log('[SUCCESS] AppController: Intelligence Enrichment Pipeline inicializado');
                } catch (error) {
                    console.error('[ERROR] AppController: Erro ao inicializar Intelligence Enrichment Pipeline:', error);
                }
            }
            
            // Inicializar ConvergenceAnalysisService se disponível
            if (KC.ConvergenceAnalysisService && KC.ConvergenceAnalysisService.initialize) {
                try {
                    console.log('[INFO] AppController: Inicializando Convergence Analysis Service...');
                    await KC.ConvergenceAnalysisService.initialize();
                    console.log('[SUCCESS] AppController: Convergence Analysis Service inicializado');
                } catch (error) {
                    console.error('[ERROR] AppController: Erro ao inicializar Convergence Analysis Service:', error);
                }
            }
        }

        /**
         * Verifica se pode navegar para etapa
         * @private
         */
        _canNavigateToStep(stepNumber) {
            // Por enquanto permite navegação livre
            // Futuramente validará se etapas anteriores foram completadas
            return true;
        }

        /**
         * Atualiza UI do workflow
         * @private
         */
        _updateWorkflowUI(activeStep) {
            // Atualiza classes dos cards
            const cards = document.querySelectorAll('.step-card');
            cards.forEach((card, index) => {
                const stepNum = index + 1;
                card.classList.toggle('active', stepNum === activeStep);
                card.classList.toggle('completed', stepNum < activeStep);
                card.classList.toggle('disabled', !this._canNavigateToStep(stepNum));
            });
        }

        /**
         * Atualiza status de navegação
         * @private
         */
        _updateNavigationStatus(stepNumber) {
            const statusEl = document.getElementById('nav-status');
            if (statusEl) {
                const step = this.steps[stepNumber - 1];
                statusEl.textContent = `Etapa ${stepNumber}/4 - ${step.name}`;
            }
        }

        /**
         * Mostra painel
         * @private
         */
        _showPanel(panelName) {
            // Caso especial para o OrganizationPanel
            if (panelName === 'organization') {
                // Esconde seções que podem interferir
                const filesSection = document.querySelector('.files-section');
                const filterSection = document.querySelector('.filter-section');
                if (filesSection) filesSection.style.display = 'none';
                if (filterSection) filterSection.style.display = 'none';
                
                // Ativa o OrganizationPanel
                if (KC.OrganizationPanel) {
                    KC.OrganizationPanel.initialize();
                    KC.OrganizationPanel.render();
                }
                return;
            }
            
            // Comportamento padrão para outros painéis
            const panel = document.getElementById(`${panelName}-panel`);
            if (panel) {
                panel.style.display = 'block';
                panel.classList.add('panel-active');
            }
        }

        /**
         * Esconde painel
         * @private
         */
        _hidePanel(panelName) {
            // Caso especial para o OrganizationPanel
            if (panelName === 'organization') {
                if (KC.OrganizationPanel) {
                    KC.OrganizationPanel.hide();
                }
                return;
            }
            
            // Comportamento padrão para outros painéis
            const panel = document.getElementById(`${panelName}-panel`);
            if (panel) {
                panel.style.display = 'none';
                panel.classList.remove('panel-active');
            }
        }

        /**
         * Atualiza visibilidade de seções
         * @private
         */
        _updateSectionVisibility(panelName) {
            const filterSection = document.getElementById('filter-section');
            const filesSection = document.getElementById('files-section');
            const statsSection = document.getElementById('stats-section');
            
            // Mostra filtros e arquivos apenas após descoberta
            const showFileSections = ['preAnalysis', 'aiAnalysis', 'organization'].includes(panelName);
            
            if (filterSection) filterSection.style.display = showFileSections ? 'block' : 'none';
            if (filesSection) filesSection.style.display = showFileSections ? 'block' : 'none';
            if (statsSection) statsSection.style.display = showFileSections ? 'block' : 'none';
        }

        /**
         * Atualiza estatísticas
         * @private
         */
        _updateStats() {
            const footerStats = document.getElementById('footer-stats');
            if (footerStats) {
                const stats = AppState.get('stats');
                footerStats.textContent = `${stats.discoveredFiles} arquivos • ${stats.analyzedFiles} analisados`;
            }
        }

        /**
         * Mostra erro de validação
         * @private
         */
        _showValidationError(message) {
            EventBus.emit(Events.NOTIFICATION_SHOW, {
                type: 'error',
                message,
                duration: 3000
            });
        }
    }

    // Cria instância singleton
    const appController = new AppController();

    // Registra no namespace global
    KC.AppController = appController;

    // Adiciona eventos específicos do controlador
    KC.Events = {
        ...KC.Events,
        APP_INITIALIZED: 'app:initialized',
        MODULE_REGISTERED: 'module:registered'
    };

})(window);
/**
 * app.js - Bootstrap da Aplicação
 * 
 * Ponto de entrada principal que inicializa o namespace global,
 * registra componentes e inicia a aplicação
 */

(function(window, document) {
    'use strict';

    // Garante que o namespace existe
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    const KC = window.KnowledgeConsolidator;

    /**
     * Verifica compatibilidade do navegador
     */
    function checkBrowserCompatibility() {
        const required = {
            'localStorage': typeof(Storage) !== 'undefined',
            'Promise': typeof(Promise) !== 'undefined',
            'Map': typeof(Map) !== 'undefined',
            'Set': typeof(Set) !== 'undefined',
            'ES6': (function() {
                try {
                    new Function('(a = 0) => a');
                    return true;
                } catch (err) {
                    return false;
                }
            })()
        };

        const missing = [];
        for (const [feature, supported] of Object.entries(required)) {
            if (!supported) missing.push(feature);
        }

        if (missing.length > 0) {
            alert(`Seu navegador não suporta: ${missing.join(', ')}. Por favor, use um navegador moderno.`);
            return false;
        }

        return true;
    }

    /**
     * Registra todos os componentes no controlador
     */
    function registerComponents() {
        const { AppController } = KC;
        
        // Inicializa ThemeManager primeiro
        KC.ThemeManager?.initialize();
        
        // Registra componentes disponíveis
        const components = [
            'WorkflowPanel',
            'DiscoveryManager',
            'AnalysisManager',
            'CategoryManager',
            'FilterManager',
            'StatsManager',
            'StatsCoordinator',
            'FileRenderer',
            'FilterPanel',
            'ModalManager',
            'FilterBar',
            'StatsPanel',
            'DashboardRenderer',
            'DuplicateDetector',
            'APIConfig',
            'AIAPIManager',
            'PromptManager',
            'AnalysisAdapter',
            'QdrantSchema',
            'RAGExportManager',
            // NOVO: Componentes de Refinamento
            'RefinementService',
            'ConvergenceCalculator',
            'RefinementDetector',
            'RefinementIndicator',
            'ExportUI',
            'OrganizationPanel',
            'GraphVisualization',
            'GraphVisualizationV2',
            'TripleStoreManager',
            'TripleStoreService',
            'TripleSchema',
            'EmbeddingService',
            'QdrantService',
            'QdrantExplorer',
            'SimilaritySearchService',
            'SchemaOrgMapper',
            // Wave 10 Production Components
            'SystemIntegrationOrchestrator',
            'CompleteSystemDeployment',
            'CanaryController',
            'ProductionMonitor',
            'RollbackManager',
            'ABTestingFramework',
            'ProductionChecklist',
            // UnifiedConfidenceSystem Components
            // 'UnifiedConfidenceController', // Comentado - componente ausente
            'QdrantScoreBridge',
            'FeatureFlagManager',
            'ScoreNormalizer',
            // 'ConfidencePerformanceMonitor', // Comentado - componente ausente
            'DataValidationManager',
            // NEW Week 2 UnifiedConfidenceSystem Components
            // 'BoostCalculator', // Comentado - componente ausente
            // 'PrefixEnhancer', // Comentado - componente ausente
            // 'ConfidenceAggregator', // Comentado - componente ausente
            // 'ZeroRelevanceResolver' // Comentado - componente ausente
        ];

        components.forEach(name => {
            if (KC[name]) {
                AppController.registerModule(name, KC[name]);
                console.log(`Componente registrado: ${name}`);
            } else {
                console.warn(`Componente não encontrado: ${name}`);
            }
        });
    }

    /**
     * Configura handlers globais de erro
     */
    function setupErrorHandlers() {
        const { EventBus, Events } = KC;

        // Handler para notificações
        EventBus.on(Events.NOTIFICATION_SHOW, (data) => {
            showNotification(data);
        });

        // Handler para erros
        EventBus.on(Events.ERROR_OCCURRED, (data) => {
            console.error('Erro no sistema:', data);
            showNotification({
                type: 'error',
                message: data.message || data.error || 'Erro desconhecido',
                duration: 5000
            });
        });

        // Handler para mudanças de estado (debug)
        if (window.location.hostname === 'localhost') {
            EventBus.on(Events.STATE_CHANGED, (data) => {
                console.log('Estado alterado:', data);
            });
        }
    }

    /**
     * Mostra notificação na UI
     */
    function showNotification({ type = 'info', message, details, duration = 3000 }) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                ${details ? `<div class="notification-details">${details}</div>` : ''}
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        // Auto-remove após duração
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('notification-fade-out');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    /**
     * Adiciona estilos temporários para notificações
     */
    function addTemporaryStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: var(--z-notification, 1000);
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                padding: 16px 40px 16px 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                position: relative;
                min-width: 300px;
                max-width: 400px;
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-content {
                word-wrap: break-word;
            }
            
            .notification-message {
                font-weight: 500;
                margin-bottom: 4px;
            }
            
            .notification-details {
                font-size: 13px;
                color: #6b7280;
                font-style: italic;
            }
            
            .notification-error {
                border-left: 4px solid #ef4444;
            }
            
            .notification-success {
                border-left: 4px solid #10b981;
            }
            
            .notification-info {
                border-left: 4px solid #3b82f6;
            }
            
            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6b7280;
                padding: 4px;
            }
            
            .notification-fade-out {
                animation: slideOut 0.3s ease-in forwards;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            /* Loading overlay */
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            
            .loading-content {
                text-align: center;
            }
            
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Mostra/esconde loading
     */
    function setupLoadingHandler() {
        const { EventBus, Events, AppState } = KC;

        EventBus.on(Events.STATE_CHANGED, (data) => {
            if (data.path === 'ui.loading') {
                const loading = data.newValue;
                const message = AppState.get('ui.loadingMessage') || 'Carregando...';
                
                let overlay = document.querySelector('.loading-overlay');
                
                if (loading && !overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'loading-overlay';
                    overlay.innerHTML = `
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <div class="loading-message">${message}</div>
                        </div>
                    `;
                    document.body.appendChild(overlay);
                } else if (!loading && overlay) {
                    overlay.remove();
                }
            }
        });
    }

    /**
     * Inicializa a aplicação
     */
    async function initializeApp() {
        console.log('Iniciando Knowledge Consolidator...');

        // Verifica compatibilidade
        if (!checkBrowserCompatibility()) {
            return;
        }

        // Adiciona estilos temporários
        addTemporaryStyles();

        // Aguarda DOM carregar completamente
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        try {
            // Registra componentes
            registerComponents();

            // Configura handlers
            setupErrorHandlers();
            setupLoadingHandler();

            // Inicializa controlador principal
            const { AppController, EventBus } = KC;
            await AppController.initialize();

            // Inicializa managers que precisam carregar dados salvos
            if (KC.CategoryManager && typeof KC.CategoryManager.initialize === 'function') {
                KC.CategoryManager.initialize();
                console.log('CategoryManager inicializado');
            }
            
            // NOVO: Inicializa RefinementService
            if (KC.RefinementService && typeof KC.RefinementService.initialize === 'function') {
                await KC.RefinementService.initialize();
                console.log('RefinementService inicializado');
            }
            
            // NOVO: Inicializa RefinementIndicator
            if (KC.RefinementIndicator && typeof KC.RefinementIndicator.initialize === 'function') {
                await KC.RefinementIndicator.initialize();
                console.log('RefinementIndicator inicializado');
            }
            
            // 🚀 UNIFIED CONFIDENCE SYSTEM - WEEK 1 + WEEK 2
            console.log('🎯 Inicializando UnifiedConfidenceSystem completo...');
            if (KC.UnifiedConfidenceControllerInstance && typeof KC.UnifiedConfidenceControllerInstance.init === 'function') {
                const result = await KC.UnifiedConfidenceControllerInstance.init();
                if (result.success) {
                    console.log('✅ UnifiedConfidenceSystem inicializado com sucesso!');
                    console.log('📊 351 pontos Qdrant + 163K prefixos ATIVOS!');
                    console.log('🔥 BoostCalculator, PrefixEnhancer, ZeroResolver, Aggregator PRONTOS!');
                    
                    // Auto-iniciar processamento em background
                    if (KC.UnifiedConfidenceControllerInstance.startBackgroundProcessing) {
                        KC.UnifiedConfidenceControllerInstance.startBackgroundProcessing();
                        console.log('⚡ Processamento em background ATIVADO!');
                    }
                } else {
                    console.warn('⚠️ UnifiedConfidenceSystem inicialização parcial:', result.error);
                }
            }
            
            // WAVE 10: Inicializar Sistema de Produção
            console.log('🚀 Inicializando componentes Wave 10...');
            
            // 1. SystemIntegrationOrchestrator (coordenador principal)
            if (KC.SystemIntegrationOrchestrator && typeof KC.SystemIntegrationOrchestrator.initialize === 'function') {
                await KC.SystemIntegrationOrchestrator.initialize();
                console.log('✅ SystemIntegrationOrchestrator inicializado');
            }
            
            // 2. CompleteSystemDeployment
            if (KC.CompleteSystemDeployment && typeof KC.CompleteSystemDeployment.initialize === 'function') {
                await KC.CompleteSystemDeployment.initialize();
                console.log('✅ CompleteSystemDeployment inicializado');
            }
            
            // 3. CanaryController
            if (KC.CanaryController && typeof KC.CanaryController.initialize === 'function') {
                await KC.CanaryController.initialize();
                console.log('✅ CanaryController inicializado');
            }
            
            // 4. ProductionMonitor
            if (KC.ProductionMonitor && typeof KC.ProductionMonitor.initialize === 'function') {
                await KC.ProductionMonitor.initialize();
                console.log('✅ ProductionMonitor inicializado');
            }
            
            // 5. RollbackManager
            if (KC.RollbackManager && typeof KC.RollbackManager.initialize === 'function') {
                await KC.RollbackManager.initialize();
                console.log('✅ RollbackManager inicializado');
            }
            
            // 6. ABTestingFramework
            if (KC.ABTestingFramework && typeof KC.ABTestingFramework.initialize === 'function') {
                await KC.ABTestingFramework.initialize();
                console.log('✅ ABTestingFramework inicializado');
            }
            
            // 7. ProductionChecklist
            if (KC.ProductionChecklist && typeof KC.ProductionChecklist.initialize === 'function') {
                await KC.ProductionChecklist.initialize();
                console.log('✅ ProductionChecklist inicializado');
            }
            
            console.log('🎉 Wave 10 Production System ativo!');
            
            // Notificação do sistema Wave 10
            showNotification({
                type: 'success',
                message: 'Wave 10 Production System ativado!',
                details: '7 componentes de produção carregados com sucesso.',
                duration: 4000
            });
            
            // UNIFIED CONFIDENCE SYSTEM: Initialize confidence system integration
            console.log('🧠 Inicializando UnifiedConfidenceSystem...');
            
            // 1. Initialize FeatureFlagManager first (required for other components)
            if (KC.FeatureFlagManager && !KC.FeatureFlagManagerInstance) {
                KC.FeatureFlagManagerInstance = new KC.FeatureFlagManager();
                console.log('✅ FeatureFlagManager inicializado');
            }
            
            // 2. Initialize UnifiedConfidenceController (main orchestrator)
            if (KC.UnifiedConfidenceController && KC.UnifiedConfidenceControllerInstance) {
                try {
                    const initResult = await KC.UnifiedConfidenceControllerInstance.init();
                    if (initResult.success) {
                        console.log('✅ UnifiedConfidenceController inicializado');
                        
                        // Enable confidence system if feature flags allow
                        const featureFlags = KC.FeatureFlagManagerInstance;
                        if (featureFlags && featureFlags.isEnabled('unified_confidence_system')) {
                            await KC.UnifiedConfidenceControllerInstance.enableConfidenceSystem();
                            console.log('✅ UnifiedConfidenceSystem ativado via feature flags');
                        }
                        
                        showNotification({
                            type: 'success',
                            message: 'Sistema de Confiança ativado!',
                            details: 'Confidence scores baseados em dados do Qdrant disponíveis.',
                            duration: 3000
                        });
                    } else {
                        console.warn('⚠️ UnifiedConfidenceController inicialização falhou:', initResult.error);
                    }
                } catch (error) {
                    console.error('❌ Erro ao inicializar UnifiedConfidenceController:', error);
                    showNotification({
                        type: 'warning',
                        message: 'Sistema de Confiança com erro',
                        details: error.message,
                        duration: 5000
                    });
                }
            }

            // FASE 1.1: Validar Ollama como padrão no carregamento
            // AIDEV-NOTE: ollama-default; Ollama é o serviço padrão de embeddings
            if (KC.EmbeddingService && typeof KC.EmbeddingService.checkOllamaAvailability === 'function') {
                const ollamaAvailable = await KC.EmbeddingService.checkOllamaAvailability();
                
                if (!ollamaAvailable) {
                    // Banner de alerta persistente se Ollama não estiver disponível
                    showNotification({
                        type: 'warning',
                        message: 'Ollama não detectado! Funcionalidade semântica limitada.',
                        details: 'Instale o Ollama e baixe o modelo nomic-embed-text para embeddings locais.',
                        duration: 0 // Persistente até ser fechado manualmente
                    });
                    
                    // Emitir evento de alerta do sistema
                    EventBus.emit(KC.Events.SYSTEM_ALERT || 'SYSTEM_ALERT', {
                        type: 'warning',
                        message: 'Ollama não detectado. Funcionalidade semântica limitada.',
                        persistent: true,
                        action: {
                            label: 'Ver guia de instalação',
                            handler: () => {
                                // Abrir documentação quando criada
                                showNotification({
                                    type: 'info',
                                    message: 'Guia de instalação do Ollama será criado em breve.',
                                    details: 'Por enquanto, visite: https://ollama.ai',
                                    duration: 5000
                                });
                            }
                        }
                    });
                    
                    console.warn('⚠️ Ollama não disponível - sistema operando com funcionalidade reduzida');
                } else {
                    console.log('✅ Ollama disponível - embeddings semânticos ativados');
                    
                    // Notificação de sucesso
                    showNotification({
                        type: 'success',
                        message: 'Ollama detectado com sucesso!',
                        details: 'Embeddings semânticos disponíveis localmente.',
                        duration: 3000
                    });
                }
                
                // Forçar Ollama como provider padrão
                KC.EmbeddingService.config.ollama.enabled = true;
                KC.EmbeddingService.config.openai.enabled = false; // Desabilitar fallback por padrão
            }
            
            // INTELLIGENCE ENRICHMENT: Inicializar pipeline de enriquecimento
            if (KC.IntelligenceEnrichmentPipeline && typeof KC.IntelligenceEnrichmentPipeline.initialize === 'function') {
                try {
                    console.log('🧠 Inicializando Intelligence Enrichment Pipeline...');
                    await KC.IntelligenceEnrichmentPipeline.initialize();
                    console.log('✅ Intelligence Enrichment Pipeline inicializado');
                    
                    showNotification({
                        type: 'success',
                        message: 'Pipeline de Inteligência ativado!',
                        details: 'Análise de convergência e insights disponíveis.',
                        duration: 3000
                    });
                } catch (error) {
                    console.error('❌ Erro ao inicializar Intelligence Enrichment Pipeline:', error);
                    showNotification({
                        type: 'warning',
                        message: 'Pipeline de Inteligência com erro',
                        details: error.message,
                        duration: 5000
                    });
                }
            }
            
            // CONVERGENCE ANALYSIS: Inicializar serviço de análise de convergência
            if (KC.ConvergenceAnalysisService && typeof KC.ConvergenceAnalysisService.initialize === 'function') {
                try {
                    console.log('📊 Inicializando Convergence Analysis Service...');
                    await KC.ConvergenceAnalysisService.initialize();
                    console.log('✅ Convergence Analysis Service inicializado');
                } catch (error) {
                    console.error('❌ Erro ao inicializar Convergence Analysis Service:', error);
                }
            }

            // Ativa modo debug em desenvolvimento
            if (window.location.hostname === 'localhost') {
                EventBus.setDebugMode(true);
                console.log('Modo debug ativado');
            }

            console.log('Knowledge Consolidator pronto!');

            // Mostra notificação de boas-vindas
            showNotification({
                type: 'success',
                message: 'Sistema inicializado com sucesso!',
                duration: 2000
            });

            // Inicializar botão Go to Top
            initGoToTopButton();
            
            // Inicializar Go to Filters
            setupGoToFilters();
            
            // Inicializar barra de filtros rápidos
            setupQuickFiltersBar();

        } catch (error) {
            console.error('Erro fatal na inicialização:', error);
            showNotification({
                type: 'error',
                message: 'Erro ao inicializar sistema. Verifique o console.',
                duration: 0
            });
        }
    }

    // Função para inicializar o botão Go to Top
    function initGoToTopButton() {
        const goToTopBtn = document.getElementById('go-to-top');
        if (!goToTopBtn) {
            console.warn('Botão Go to Top não encontrado');
            return;
        }

        let isScrolling = false;

        // Mostrar/ocultar botão baseado no scroll
        function handleScroll() {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    
                    if (scrollTop > 300) {
                        goToTopBtn.classList.add('visible');
                    } else {
                        goToTopBtn.classList.remove('visible');
                    }
                    
                    isScrolling = false;
                });
                isScrolling = true;
            }
        }

        // Adicionar listener de scroll com throttle
        window.addEventListener('scroll', handleScroll);

        // Função para ir ao topo com smooth scroll
        goToTopBtn.addEventListener('click', () => {
            // Primeiro tenta ir para o topo da lista de arquivos
            const filesSection = document.getElementById('files-section');
            const contentSection = document.getElementById('content-section');
            
            if (filesSection && filesSection.style.display !== 'none') {
                // Se a seção de arquivos estiver visível, vai para o topo dela
                filesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (contentSection) {
                // Senão, vai para o topo da seção de conteúdo
                contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                // Fallback: vai para o topo da página
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        // Verificar scroll inicial
        handleScroll();
        
        console.log('Botão Go to Top inicializado');
    }
    
    // Configurar botão Go to Filters
    function setupGoToFilters() {
        const goToFiltersBtn = document.getElementById('go-to-filters');
        if (!goToFiltersBtn) {
            console.warn('Botão Go to Filters não encontrado');
            return;
        }
        
        // Função para ir ao painel de filtros com smooth scroll
        goToFiltersBtn.addEventListener('click', () => {
            const filterPanel = document.getElementById('filter-panel-container');
            
            if (filterPanel) {
                // Vai para o painel de filtros
                filterPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                console.warn('Painel de filtros não encontrado');
            }
        });
        
        console.log('Botão Go to Filters inicializado');
    }

    // Configurar barra de filtros rápidos
    function setupQuickFiltersBar() {
        const quickFiltersToggle = document.getElementById('quick-filters-toggle');
        const quickFiltersBar = document.getElementById('quick-filters-bar');
        
        if (!quickFiltersToggle || !quickFiltersBar) {
            console.warn('Elementos de filtros rápidos não encontrados');
            return;
        }
        
        // Estado inicial - fechado
        let isExpanded = false;
        
        // Toggle ao clicar no botão
        quickFiltersToggle.addEventListener('click', () => {
            isExpanded = !isExpanded;
            if (isExpanded) {
                quickFiltersBar.classList.add('show');
                quickFiltersToggle.title = 'Ocultar Filtros Rápidos';
            } else {
                quickFiltersBar.classList.remove('show');
                quickFiltersToggle.title = 'Mostrar Filtros Rápidos';
            }
        });
        
        // ESC fecha a barra
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isExpanded) {
                isExpanded = false;
                quickFiltersBar.classList.remove('show');
                quickFiltersToggle.title = 'Mostrar Filtros Rápidos';
            }
        });
        
        // NÃO fecha ao clicar fora (mantém aberto para agilizar curadora)
        
        // Adicionar listeners aos filtros
        quickFiltersBar.querySelectorAll('.quick-filter-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Debug
                console.log('Quick filter clicked:', {
                    filterType: item.dataset.filter,
                    filterValue: item.dataset.value,
                    FilterManagerExists: !!KC.FilterManager
                });
                
                const filterType = item.dataset.filter;
                const filterValue = item.dataset.value;
                
                // Verificar se FilterManager existe
                if (!KC.FilterManager) {
                    console.error('FilterManager não está disponível');
                    KC.showNotification({
                        type: 'error',
                        message: 'Sistema de filtros não está carregado',
                        duration: 3000
                    });
                    return;
                }
                
                // Aplicar filtro no FilterManager
                if (filterType && filterValue) {
                    // Limpar filtros atuais
                    KC.FilterManager.clearAllFilters();
                    
                    // Tratamento especial para diferentes tipos de filtro
                    let filterApplied = false;
                    
                    if (filterType === 'status') {
                        // Filtros de status
                        if (filterValue === 'todos') {
                            // Mostrar todos - não aplicar filtro
                            filterApplied = true;
                        } else if (filterValue === 'pendente') {
                            KC.FilterManager.filters.approved = false;
                            KC.FilterManager.filters.archived = false;
                            filterApplied = true;
                        } else if (filterValue === 'aprovados') {
                            KC.FilterManager.filters.approved = true;
                            KC.FilterManager.filters.archived = false;
                            filterApplied = true;
                        }
                    } else if (filterType === 'relevance') {
                        // Filtros de relevância
                        if (filterValue === 'alta') {
                            KC.FilterManager.filters.relevanceThreshold = 70;
                            filterApplied = true;
                        } else if (filterValue === 'media') {
                            KC.FilterManager.filters.relevanceThreshold = 30;
                            KC.FilterManager.filters.relevanceMax = 69;
                            filterApplied = true;
                        } else if (filterValue === 'baixa') {
                            KC.FilterManager.filters.relevanceMax = 29;
                            filterApplied = true;
                        }
                    }
                    
                    // Aplicar novo filtro - fallback para estrutura antiga
                    if (!filterApplied && KC.FilterManager.filters[filterType] && KC.FilterManager.filters[filterType][filterValue]) {
                        KC.FilterManager.filters[filterType][filterValue].active = true;
                        filterApplied = true;
                    }
                    
                    // Se algum filtro foi aplicado
                    if (filterApplied) {
                        // Remover classe active de todos
                        quickFiltersBar.querySelectorAll('.quick-filter-item').forEach(f => f.classList.remove('active'));
                        
                        // Adicionar active ao clicado
                        item.classList.add('active');
                        
                        // Aplicar filtros
                        KC.FilterManager.applyFilters();
                        KC.FilterManager.saveFiltersState();
                        
                        // Scroll suave para a lista de arquivos
                        const filesSection = document.getElementById('files-section');
                        if (filesSection) {
                            filesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                        
                        // Notificar aplicação do filtro
                        KC.showNotification({
                            type: 'info',
                            message: `Filtro aplicado: ${item.querySelector('.filter-label').textContent}`,
                            duration: 2000
                        });
                    }
                }
            });
        });
        
        // Botão de navegação - Etapa anterior
        const navPrev = document.getElementById('nav-prev');
        if (navPrev) {
            navPrev.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Nav prev clicked');
                
                const currentStep = KC.AppState.get('currentStep') || 2;
                if (currentStep > 1) {
                    KC.AppController.navigateToStep(currentStep - 1);
                } else {
                    console.log('Already at first step');
                }
            });
        }
        
        // Botão de navegação - Próxima etapa
        const navNext = document.getElementById('nav-next');
        if (navNext) {
            navNext.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Nav next clicked');
                
                const currentStep = KC.AppState.get('currentStep') || 2;
                if (currentStep < 4) {
                    KC.AppController.navigateToStep(currentStep + 1);
                } else {
                    console.log('Already at last step');
                }
            });
        }
        
        // Botão exportar filtro atual
        const exportFilter = document.getElementById('export-filter');
        if (exportFilter) {
            // COMENTADO: Handler duplicado removido
            // O botão de exportar agora é gerenciado pelo quick-filters-final-fix.js
            // que suporta exportação de arquivos selecionados e filtrados
            /*
            exportFilter.addEventListener('click', (e) => {
                // Removido - ver quick-filters-final-fix.js linha 126-134
            });
            */
        }
        
        // Integrar com FilterManager para atualizar contadores
        KC.EventBus.on('FILES_UPDATED', updateQuickFilterCounters);
        KC.EventBus.on('STATE_CHANGED', (data) => {
            if (data.key === 'files') {
                updateQuickFilterCounters();
            }
        });
        
        // Atualizar contadores iniciais
        updateQuickFilterCounters();
        
        console.log('Barra de filtros rápidos inicializada');
    }
    
    // Função para atualizar contadores da barra de filtros rápidos
    function updateQuickFilterCounters() {
        const files = KC.AppState.get('files') || [];
        
        // Contadores de status
        const allCount = files.length;
        const pendingCount = files.filter(f => !f.approved && !f.archived).length;
        const approvedCount = files.filter(f => f.approved && !f.archived).length;
        const archivedCount = files.filter(f => f.archived).length;
        
        // Contadores de relevância
        const highCount = files.filter(f => f.relevanceScore >= 70 && !f.archived).length;
        const mediumCount = files.filter(f => f.relevanceScore >= 30 && f.relevanceScore < 70 && !f.archived).length;
        const lowCount = files.filter(f => f.relevanceScore < 30 && !f.archived).length;
        
        // Atualizar elementos da barra de filtros rápidos
        const quickCountAll = document.getElementById('quick-count-all');
        const quickCountPending = document.getElementById('quick-count-pending');
        const quickCountApproved = document.getElementById('quick-count-approved');
        const quickCountArchived = document.getElementById('quick-count-archived');
        const quickCountHigh = document.getElementById('quick-count-high');
        const quickCountMedium = document.getElementById('quick-count-medium');
        const quickCountLow = document.getElementById('quick-count-low');
        
        if (quickCountAll) quickCountAll.textContent = allCount;
        if (quickCountPending) quickCountPending.textContent = pendingCount;
        if (quickCountApproved) quickCountApproved.textContent = approvedCount;
        if (quickCountArchived) quickCountArchived.textContent = archivedCount;
        if (quickCountHigh) quickCountHigh.textContent = highCount;
        if (quickCountMedium) quickCountMedium.textContent = mediumCount;
        if (quickCountLow) quickCountLow.textContent = lowCount;
        
        // Atualizar texto dos botões de navegação baseado na etapa atual
        const currentStep = KC.AppState.get('currentStep') || 2;
        const navPrev = document.getElementById('nav-prev');
        const navNext = document.getElementById('nav-next');
        
        if (navPrev) {
            navPrev.querySelector('span').textContent = currentStep > 1 ? `◀ Etapa ${currentStep - 1}` : '◀ Etapa I';
            navPrev.disabled = currentStep <= 1;
        }
        
        if (navNext) {
            navNext.querySelector('span').textContent = currentStep < 4 ? `Etapa ${currentStep + 1} ▶` : 'Etapa III ▶';
            navNext.disabled = currentStep >= 4;
        }
    }

    // Inicia quando o script carregar
    initializeApp();

    // Exporta função de inicialização para debug
    KC.initializeApp = initializeApp;
    KC.showNotification = showNotification;
    KC.updateQuickFilterCounters = updateQuickFilterCounters;
    
    // Garante que showNotification esteja disponível mesmo antes da inicialização
    window.KnowledgeConsolidator.showNotification = showNotification;
    
    // Cria função global para exibir notificações
    window.KC = window.KnowledgeConsolidator;
    
    // Cria função global para handlers onclick com verificação de namespace
    window.callKC = function(method, ...args) {
        if (window.KnowledgeConsolidator && window.KnowledgeConsolidator.WorkflowPanel) {
            const methodParts = method.split('.');
            let obj = window.KnowledgeConsolidator;
            
            for (const part of methodParts) {
                if (obj && obj[part]) {
                    obj = obj[part];
                } else {
                    console.error(`Método ${method} não encontrado no namespace KC`);
                    return;
                }
            }
            
            if (typeof obj === 'function') {
                // Preservar contexto para métodos do AppController
                if (method.startsWith('AppController.') && KC.AppController) {
                    return obj.call(KC.AppController, ...args);
                }
                return obj(...args);
            }
        } else {
            console.error('KnowledgeConsolidator ainda não foi inicializado');
        }
    };
    
    // Função de teste para modal
    window.testModal = function() {
        console.log('Testando modal...');
        if (KC.ModalManager) {
            KC.ModalManager.showModal('test', `
                <div class="modal-header">
                    <h2>Modal de Teste</h2>
                </div>
                <div class="modal-body">
                    <p>Este é um modal de teste!</p>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="KC.ModalManager.closeModal('test')">
                        Fechar
                    </button>
                </div>
            `);
        } else {
            console.error('ModalManager não disponível');
        }
    };

    // Comando de diagnóstico completo
    window.kcdiag = function() {
        console.group('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA');
        
        const components = [
            'EventBus', 'AppState', 'AppController',
            'Logger', 'handleManager', 'compatibility',
            'DiscoveryManager', 'WorkflowPanel', 'ModalManager'
        ];
        
        console.log('📊 Status dos Componentes:');
        components.forEach(comp => {
            const status = KC[comp] ? '✅' : '❌';
            const type = typeof KC[comp];
            console.log(`${status} KC.${comp}: ${type}`);
        });
        
        if (KC.handleManager) {
            console.log('🗂️ Handles Registrados:', KC.handleManager.list());
            console.log('📈 Estatísticas Handles:', KC.handleManager.getStats());
        }
        
        if (KC.compatibility) {
            console.log('🌐 Compatibilidade:', KC.compatibility.isSupported() ? 'Suportado' : 'Não Suportado');
        }
        
        console.groupEnd();
        return 'Diagnóstico concluído';
    };

})(window, document);
/**
 * SystemIntegrationOrchestrator.js
 * 
 * Orquestrador simples que integra componentes KC e ML
 * Foco em simplicidade e funcionalidade real
 */

class SystemIntegrationOrchestrator {
    constructor() {
        this.components = {
            kc: {},      // Knowledge Consolidator components
            ml: {},      // Machine Learning components
            apis: {}     // Browser APIs status
        };
        this.initialized = false;
        this.healthCheckInterval = null;
    }

    /**
     * Inicializa o orquestrador e todos os componentes
     */
    async initialize() {
        console.log('[SystemIntegrationOrchestrator] Iniciando...');
        
        try {
            // 1. Validar APIs do browser
            await this.validateBrowserAPIs();
            
            // 2. Carregar componentes KC
            await this.loadKCComponents();
            
            // 3. Carregar componentes ML
            await this.loadMLComponents();
            
            // 4. Conectar os sistemas
            await this.connectSystems();
            
            // 5. Iniciar health check
            this.startHealthCheck();
            
            this.initialized = true;
            console.log('[SystemIntegrationOrchestrator] ✅ Inicialização completa');
            
            return {
                success: true,
                components: this.components
            };
            
        } catch (error) {
            console.error('[SystemIntegrationOrchestrator] ❌ Erro na inicialização:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Valida disponibilidade das APIs do browser
     */
    async validateBrowserAPIs() {
        console.log('[SystemIntegrationOrchestrator] Validando APIs do browser...');
        
        this.components.apis = {
            fileSystem: 'showOpenFilePicker' in window,
            indexedDB: 'indexedDB' in window,
            webWorkers: 'Worker' in window,
            localStorage: 'localStorage' in window,
            serviceWorker: 'serviceWorker' in navigator
        };
        
        // Verificar APIs críticas
        const criticalAPIs = ['fileSystem', 'indexedDB', 'localStorage'];
        const missingAPIs = criticalAPIs.filter(api => !this.components.apis[api]);
        
        if (missingAPIs.length > 0) {
            throw new Error(`APIs críticas não disponíveis: ${missingAPIs.join(', ')}`);
        }
        
        console.log('[SystemIntegrationOrchestrator] ✅ APIs validadas:', this.components.apis);
    }

    /**
     * Carrega componentes do Knowledge Consolidator
     */
    async loadKCComponents() {
        console.log('[SystemIntegrationOrchestrator] Carregando componentes KC...');
        
        const KC = window.KnowledgeConsolidator || window.KC;
        
        if (!KC) {
            throw new Error('Knowledge Consolidator não encontrado no window');
        }
        
        // Componentes essenciais
        const essentialComponents = [
            'AppState',
            'EventBus',
            'DiscoveryManager',
            'AnalysisManager',
            'CategoryManager',
            'FilterManager',
            'RAGExportManager'
        ];
        
        // Carregar cada componente
        for (const component of essentialComponents) {
            if (KC[component]) {
                this.components.kc[component] = KC[component];
                console.log(`[SystemIntegrationOrchestrator] ✅ ${component} carregado`);
            } else {
                console.warn(`[SystemIntegrationOrchestrator] ⚠️ ${component} não encontrado`);
            }
        }
        
        // Verificar componentes críticos
        if (!this.components.kc.AppState || !this.components.kc.EventBus) {
            throw new Error('Componentes críticos KC não encontrados');
        }
    }

    /**
     * Carrega componentes de Machine Learning
     */
    async loadMLComponents() {
        console.log('[SystemIntegrationOrchestrator] Carregando componentes ML...');
        
        const KC = window.KnowledgeConsolidator || window.KC;
        
        // Componentes ML da Wave 6-9
        const mlComponents = [
            'ConfidenceCalculator',
            'ConfidenceTracker',
            'ConfidenceValidator',
            'MLDashboard',
            'WorkerPoolManager'
        ];
        
        // Carregar cada componente
        for (const component of mlComponents) {
            if (KC && KC[component]) {
                this.components.ml[component] = KC[component];
                console.log(`[SystemIntegrationOrchestrator] ✅ ${component} carregado`);
            } else {
                console.warn(`[SystemIntegrationOrchestrator] ⚠️ ${component} não encontrado`);
            }
        }
        
        // Se não houver componentes ML, criar estrutura básica
        if (Object.keys(this.components.ml).length === 0) {
            console.warn('[SystemIntegrationOrchestrator] Nenhum componente ML encontrado, criando estrutura básica');
            this.components.ml = {
                enabled: false,
                message: 'Componentes ML não disponíveis'
            };
        }
    }

    /**
     * Conecta os sistemas KC e ML
     */
    async connectSystems() {
        console.log('[SystemIntegrationOrchestrator] Conectando sistemas...');
        
        const { EventBus, AppState } = this.components.kc;
        
        if (!EventBus || !AppState) {
            console.warn('[SystemIntegrationOrchestrator] Não foi possível conectar sistemas - componentes ausentes');
            return;
        }
        
        // Registrar eventos de integração
        const Events = window.KC?.Events || {};
        
        // Listener para mudanças de estado
        if (Events.STATE_CHANGED) {
            EventBus.on(Events.STATE_CHANGED, (data) => {
                console.log('[SystemIntegrationOrchestrator] Estado alterado:', data.key);
                
                // Se ML estiver ativo, notificar componentes ML
                if (this.components.ml.ConfidenceTracker && data.key === 'files') {
                    this.updateMLConfidence(data.newValue);
                }
            });
        }
        
        // Listener para análise de arquivos
        if (Events.ANALYSIS_COMPLETED) {
            EventBus.on(Events.ANALYSIS_COMPLETED, (data) => {
                console.log('[SystemIntegrationOrchestrator] Análise concluída:', data.fileId);
                
                // Calcular confiança ML se disponível
                if (this.components.ml.ConfidenceCalculator) {
                    this.calculateFileConfidence(data.fileId);
                }
            });
        }
        
        console.log('[SystemIntegrationOrchestrator] ✅ Sistemas conectados');
    }

    /**
     * Atualiza confiança ML para arquivos
     */
    updateMLConfidence(files) {
        if (!Array.isArray(files) || !this.components.ml.ConfidenceCalculator) {
            return;
        }
        
        try {
            files.forEach(file => {
                if (file.analysisResult) {
                    const confidence = this.components.ml.ConfidenceCalculator.calculate(file);
                    if (confidence) {
                        file.mlConfidence = confidence;
                    }
                }
            });
        } catch (error) {
            console.error('[SystemIntegrationOrchestrator] Erro ao atualizar confiança ML:', error);
        }
    }

    /**
     * Calcula confiança para um arquivo específico
     */
    calculateFileConfidence(fileId) {
        const { AppState } = this.components.kc;
        const { ConfidenceCalculator } = this.components.ml;
        
        if (!AppState || !ConfidenceCalculator) {
            return;
        }
        
        try {
            const files = AppState.get('files') || [];
            const file = files.find(f => f.id === fileId);
            
            if (file && file.analysisResult) {
                const confidence = ConfidenceCalculator.calculate(file);
                if (confidence) {
                    file.mlConfidence = confidence;
                    AppState.set('files', files);
                }
            }
        } catch (error) {
            console.error('[SystemIntegrationOrchestrator] Erro ao calcular confiança:', error);
        }
    }

    /**
     * Inicia verificação periódica de saúde do sistema
     */
    startHealthCheck() {
        console.log('[SystemIntegrationOrchestrator] Iniciando health check...');
        
        // Executar primeiro check imediatamente
        this.performHealthCheck();
        
        // Configurar intervalo de 30 segundos
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000);
    }

    /**
     * Executa verificação de saúde
     */
    performHealthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            components: {
                kc: {},
                ml: {},
                apis: this.components.apis
            }
        };
        
        // Verificar componentes KC
        Object.keys(this.components.kc).forEach(component => {
            health.components.kc[component] = {
                loaded: !!this.components.kc[component],
                functional: this.checkComponentHealth(this.components.kc[component])
            };
        });
        
        // Verificar componentes ML
        if (this.components.ml.enabled !== false) {
            Object.keys(this.components.ml).forEach(component => {
                health.components.ml[component] = {
                    loaded: !!this.components.ml[component],
                    functional: this.checkComponentHealth(this.components.ml[component])
                };
            });
        }
        
        // Verificar memória
        if (performance.memory) {
            health.memory = {
                usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
                totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB'
            };
        }
        
        // Verificar localStorage
        try {
            const storageUsed = new Blob(Object.values(localStorage)).size;
            health.localStorage = {
                used: Math.round(storageUsed / 1024) + 'KB',
                available: true
            };
        } catch (error) {
            health.localStorage = { available: false };
        }
        
        // Determinar status geral
        const kcHealthy = Object.values(health.components.kc).every(c => c.loaded && c.functional);
        if (!kcHealthy) {
            health.status = 'degraded';
        }
        
        console.log('[SystemIntegrationOrchestrator] Health check:', health);
        
        // Emitir evento de health check se EventBus disponível
        if (this.components.kc.EventBus) {
            this.components.kc.EventBus.emit('SYSTEM_HEALTH_CHECK', health);
        }
        
        return health;
    }

    /**
     * Verifica saúde de um componente específico
     */
    checkComponentHealth(component) {
        if (!component) return false;
        
        // Verificações básicas
        if (typeof component === 'object') {
            // Verificar métodos no objeto e no protótipo
            const ownMethods = Object.values(component).filter(v => typeof v === 'function');
            
            // Verificar métodos no protótipo (para classes)
            const proto = Object.getPrototypeOf(component);
            const protoMethods = proto ? Object.getOwnPropertyNames(proto).filter(name => 
                name !== 'constructor' && typeof proto[name] === 'function'
            ) : [];
            
            // Considerar funcional se tem métodos próprios ou no protótipo
            return ownMethods.length > 0 || protoMethods.length > 0;
        }
        
        return true;
    }

    /**
     * Para o orquestrador e limpa recursos
     */
    stop() {
        console.log('[SystemIntegrationOrchestrator] Parando...');
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        this.initialized = false;
        console.log('[SystemIntegrationOrchestrator] ✅ Parado');
    }

    /**
     * Retorna status atual do sistema
     */
    getStatus() {
        return {
            initialized: this.initialized,
            components: {
                kc: Object.keys(this.components.kc),
                ml: Object.keys(this.components.ml),
                apis: this.components.apis
            },
            health: this.initialized ? this.performHealthCheck() : null
        };
    }
}

// Registrar no window para debug
if (typeof window !== 'undefined') {
    window.KC = window.KC || {};
    window.KC.SystemIntegrationOrchestrator = SystemIntegrationOrchestrator;
    
    // Criar instância singleton
    window.KC.systemOrchestrator = new SystemIntegrationOrchestrator();
    
    if (window.KnowledgeConsolidator) {
        window.KnowledgeConsolidator.SystemIntegrationOrchestrator = window.KC.systemOrchestrator;
    }
}
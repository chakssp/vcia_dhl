/**
 * TripleStoreManager.js - Gerenciador de Triplas Semânticas
 * 
 * Sistema unificado de inteligência baseado em triplas (Legado-Presente-Objetivo)
 * Conecta todas as fontes de dados e permite aprendizado contínuo
 * 
 * @version 1.0.0
 * @author Knowledge Consolidator
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;
    const Logger = KC.Logger;

    class TripleStoreManager {
        constructor() {
            // Armazenamento principal de triplas
            this.triplas = new Map();
            
            // Índices para busca otimizada
            this.indices = {
                porLegado: new Map(),
                porPresente: new Map(),
                porObjetivo: new Map(),
                porTipo: new Map(),
                porFonte: new Map()
            };
            
            // Estatísticas
            this.stats = {
                totalTriplas: 0,
                triplasPorTipo: {},
                triplasPorFonte: {},
                ultimaAtualizacao: null
            };
            
            // Cache para queries frequentes
            this.queryCache = new Map();
            this.cacheMaxSize = 100;
            
            // Configurações
            this.config = {
                autoSave: true,
                autoIndex: true,
                validateSchema: true
            };
            
            this.logger = KC.Logger;
        }

        /**
         * Inicializa o gerenciador
         */
        async initialize() {
            this.logger.info('TripleStoreManager', 'Inicializando TripleStoreManager...');
            
            try {
                // Registrar novos eventos no EventBus
                this.registerEvents();
                
                // Carregar triplas salvas
                await this.loadFromStorage();
                
                // Configurar listeners
                this.setupEventListeners();
                
                this.logger.success('TripleStoreManager', `TripleStoreManager inicializado com ${this.stats.totalTriplas} triplas`);
                
                // Emitir evento de inicialização
                EventBus.emit(Events.TRIPLE_STORE_INITIALIZED, {
                    totalTriplas: this.stats.totalTriplas,
                    stats: this.stats
                });
                
            } catch (error) {
                this.logger.error('TripleStoreManager', 'Erro ao inicializar TripleStoreManager:', error);
                throw error;
            }
        }

        /**
         * Registra novos eventos no sistema
         */
        registerEvents() {
            // Adicionar novos eventos ao objeto Events global
            if (!Events.TRIPLA_ADICIONADA) {
                Events.TRIPLA_ADICIONADA = 'tripla:added';
                Events.TRIPLA_REMOVIDA = 'tripla:removed';
                Events.TRIPLA_ATUALIZADA = 'tripla:updated';
                Events.TRIPLE_STORE_INITIALIZED = 'tripleStore:initialized';
                Events.TRIPLE_STORE_SAVED = 'tripleStore:saved';
                Events.INSIGHT_GERADO = 'insight:generated';
            }
        }

        /**
         * Adiciona uma nova tripla ao sistema
         * @param {string} legado - O que herdamos/já existe (KEY_SYS.R)
         * @param {string} presente - Estado/contexto atual (KEY_SUB.R)
         * @param {string} objetivo - Meta/ação desejada (KEY_ACT.R)
         * @param {Object} metadados - Metadados adicionais
         * @returns {Object} A tripla criada
         */
        async adicionarTripla(legado, presente, objetivo, metadados = {}) {
            try {
                // Validar entrada
                if (!legado || !presente || !objetivo) {
                    throw new Error('Tripla deve ter legado, presente e objetivo');
                }
                
                // Criar estrutura da tripla
                const tripla = {
                    id: this.gerarId(),
                    legado: {
                        tipo: 'SYS.R',
                        valor: legado
                    },
                    presente: {
                        tipo: 'SUB.R',
                        valor: presente
                    },
                    objetivo: {
                        tipo: 'ACT.R',
                        valor: objetivo
                    },
                    metadados: {
                        ...metadados,
                        timestamp: new Date().toISOString(),
                        fonte: metadados.fonte || 'manual',
                        confianca: metadados.confianca || 1.0,
                        versao: 1
                    }
                };
                
                // Validar schema se configurado
                if (this.config.validateSchema && KC.TripleSchema) {
                    const validacao = KC.TripleSchema.validarTripla(tripla);
                    if (!validacao.valida) {
                        throw new Error(`Tripla inválida: ${validacao.erro}`);
                    }
                }
                
                // Armazenar tripla
                this.triplas.set(tripla.id, tripla);
                
                // Atualizar índices
                if (this.config.autoIndex) {
                    this.atualizarIndices(tripla);
                }
                
                // Atualizar estatísticas
                this.atualizarEstatisticas('adicao', tripla);
                
                // Limpar cache afetado
                this.limparCacheRelacionado(tripla);
                
                // Salvar automaticamente se configurado
                if (this.config.autoSave) {
                    await this.saveToStorage();
                }
                
                // Emitir evento
                EventBus.emit(Events.TRIPLA_ADICIONADA, {
                    tripla: tripla,
                    stats: this.stats
                });
                
                this.logger.info('TripleStoreManager', `Tripla adicionada: ${legado} -> ${presente} -> ${objetivo}`);
                
                return tripla;
                
            } catch (error) {
                this.logger.error('TripleStoreManager', 'Erro ao adicionar tripla:', error);
                throw error;
            }
        }

        /**
         * Busca triplas por padrão
         * @param {Object} padrao - Padrão de busca {legado, presente, objetivo}
         * @returns {Array} Triplas encontradas
         */
        buscar(padrao) {
            try {
                // Verificar cache primeiro
                const cacheKey = JSON.stringify(padrao);
                if (this.queryCache.has(cacheKey)) {
                    return this.queryCache.get(cacheKey);
                }
                
                let resultados = [];
                
                // Se tem legado específico, usar índice
                if (padrao.legado) {
                    const triplaIds = this.indices.porLegado.get(padrao.legado) || new Set();
                    resultados = Array.from(triplaIds).map(id => this.triplas.get(id));
                } else {
                    // Busca em todas as triplas
                    resultados = Array.from(this.triplas.values());
                }
                
                // Filtrar por presente se especificado
                if (padrao.presente) {
                    resultados = resultados.filter(t => 
                        t.presente.valor === padrao.presente ||
                        t.presente.valor.includes(padrao.presente)
                    );
                }
                
                // Filtrar por objetivo se especificado
                if (padrao.objetivo) {
                    resultados = resultados.filter(t => 
                        t.objetivo.valor === padrao.objetivo ||
                        t.objetivo.valor.includes(padrao.objetivo)
                    );
                }
                
                // Filtrar por metadados se especificado
                if (padrao.metadados) {
                    resultados = this.filtrarPorMetadados(resultados, padrao.metadados);
                }
                
                // Ordenar por confiança decrescente
                resultados.sort((a, b) => 
                    (b.metadados.confianca || 0) - (a.metadados.confianca || 0)
                );
                
                // Cachear resultado
                this.adicionarAoCache(cacheKey, resultados);
                
                return resultados;
                
            } catch (error) {
                this.logger.error('TripleStoreManager', 'Erro ao buscar triplas:', error);
                return [];
            }
        }

        /**
         * Busca triplas relacionadas a uma entidade
         * @param {string} entidade - ID da entidade
         * @returns {Object} Triplas organizadas por relação
         */
        buscarRelacionadas(entidade) {
            const relacionadas = {
                comoLegado: this.buscar({ legado: entidade }),
                comoObjetivo: this.buscar({ objetivo: entidade }),
                mencionada: []
            };
            
            // Buscar onde a entidade é mencionada no presente
            this.triplas.forEach(tripla => {
                if (tripla.presente.valor.includes(entidade)) {
                    relacionadas.mencionada.push(tripla);
                }
            });
            
            return relacionadas;
        }

        /**
         * Atualiza índices com nova tripla
         * @private
         */
        atualizarIndices(tripla) {
            // Índice por legado
            if (!this.indices.porLegado.has(tripla.legado.valor)) {
                this.indices.porLegado.set(tripla.legado.valor, new Set());
            }
            this.indices.porLegado.get(tripla.legado.valor).add(tripla.id);
            
            // Índice por presente
            if (!this.indices.porPresente.has(tripla.presente.valor)) {
                this.indices.porPresente.set(tripla.presente.valor, new Set());
            }
            this.indices.porPresente.get(tripla.presente.valor).add(tripla.id);
            
            // Índice por objetivo
            if (!this.indices.porObjetivo.has(tripla.objetivo.valor)) {
                this.indices.porObjetivo.set(tripla.objetivo.valor, new Set());
            }
            this.indices.porObjetivo.get(tripla.objetivo.valor).add(tripla.id);
            
            // Índice por tipo de presente (predicado)
            if (!this.indices.porTipo.has(tripla.presente.valor)) {
                this.indices.porTipo.set(tripla.presente.valor, new Set());
            }
            this.indices.porTipo.get(tripla.presente.valor).add(tripla.id);
            
            // Índice por fonte
            const fonte = tripla.metadados.fonte;
            if (!this.indices.porFonte.has(fonte)) {
                this.indices.porFonte.set(fonte, new Set());
            }
            this.indices.porFonte.get(fonte).add(tripla.id);
        }

        /**
         * Atualiza estatísticas
         * @private
         */
        atualizarEstatisticas(acao, tripla) {
            if (acao === 'adicao') {
                this.stats.totalTriplas++;
                
                // Por tipo (presente/predicado)
                const tipo = tripla.presente.valor;
                this.stats.triplasPorTipo[tipo] = (this.stats.triplasPorTipo[tipo] || 0) + 1;
                
                // Por fonte
                const fonte = tripla.metadados.fonte;
                this.stats.triplasPorFonte[fonte] = (this.stats.triplasPorFonte[fonte] || 0) + 1;
            }
            
            this.stats.ultimaAtualizacao = new Date().toISOString();
        }

        /**
         * Remove tripla por ID
         */
        async removerTripla(triplaId) {
            const tripla = this.triplas.get(triplaId);
            if (!tripla) return false;
            
            // Remover dos índices
            this.removerDosIndices(tripla);
            
            // Remover do store principal
            this.triplas.delete(triplaId);
            
            // Atualizar estatísticas
            this.stats.totalTriplas--;
            
            // Limpar cache
            this.queryCache.clear();
            
            // Salvar
            if (this.config.autoSave) {
                await this.saveToStorage();
            }
            
            // Emitir evento
            EventBus.emit(Events.TRIPLA_REMOVIDA, { triplaId, tripla });
            
            return true;
        }

        /**
         * Remove tripla dos índices
         * @private
         */
        removerDosIndices(tripla) {
            this.indices.porLegado.get(tripla.legado.valor)?.delete(tripla.id);
            this.indices.porPresente.get(tripla.presente.valor)?.delete(tripla.id);
            this.indices.porObjetivo.get(tripla.objetivo.valor)?.delete(tripla.id);
            this.indices.porTipo.get(tripla.presente.valor)?.delete(tripla.id);
            this.indices.porFonte.get(tripla.metadados.fonte)?.delete(tripla.id);
        }

        /**
         * Gera ID único para tripla
         * @private
         */
        gerarId() {
            // Gera um UUID v4 simples
            return `tripla_${([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            )}`;
        }

        /**
         * Filtra resultados por metadados
         * @private
         */
        filtrarPorMetadados(triplas, filtroMetadados) {
            return triplas.filter(tripla => {
                for (const [chave, valor] of Object.entries(filtroMetadados)) {
                    if (tripla.metadados[chave] !== valor) {
                        return false;
                    }
                }
                return true;
            });
        }

        /**
         * Gerencia cache de queries
         * @private
         */
        adicionarAoCache(chave, resultado) {
            // Limitar tamanho do cache
            if (this.queryCache.size >= this.cacheMaxSize) {
                const primeiraChave = this.queryCache.keys().next().value;
                this.queryCache.delete(primeiraChave);
            }
            this.queryCache.set(chave, resultado);
        }

        /**
         * Limpa cache relacionado a uma tripla
         * @private
         */
        limparCacheRelacionado(tripla) {
            // Por enquanto, limpar todo o cache
            // TODO: Implementar limpeza seletiva
            this.queryCache.clear();
        }

        /**
         * Configura listeners de eventos
         * @private
         */
        setupEventListeners() {
            // Listener para quando arquivos são analisados
            if (Events.FILE_ANALYZED) {
                EventBus.on(Events.FILE_ANALYZED, async (data) => {
                    await this.extrairTriplasDeAnalise(data);
                });
            }
            
            // Listener para quando categorias são atribuídas
            if (Events.FILE_CATEGORIZED) {
                EventBus.on(Events.FILE_CATEGORIZED, async (data) => {
                    await this.registrarCategorizacao(data);
                });
            }
        }

        /**
         * Extrai triplas de uma análise de arquivo
         * @private
         */
        async extrairTriplasDeAnalise(data) {
            const { file, analysis } = data;
            
            // Tripla: arquivo -> foi analisado -> tipo de análise
            await this.adicionarTripla(
                file.id,
                'foiAnalisadoComo',
                analysis.type,
                {
                    fonte: 'analise_ia',
                    confianca: analysis.confidence || 0.8,
                    analise: analysis
                }
            );
            
            // Se tem categorias sugeridas
            if (analysis.suggestedCategories) {
                for (const categoria of analysis.suggestedCategories) {
                    await this.adicionarTripla(
                        file.id,
                        'sugeridaCategoria',
                        categoria,
                        {
                            fonte: 'analise_ia',
                            confianca: 0.7
                        }
                    );
                }
            }
        }

        /**
         * Registra uma categorização manual
         * @private
         */
        async registrarCategorizacao(data) {
            const { fileId, categoryId, userId } = data;
            
            // Tripla: arquivo -> categorizado como -> categoria
            await this.adicionarTripla(
                fileId,
                'categorizadoComo',
                categoryId,
                {
                    fonte: 'curadoria_manual',
                    confianca: 1.0,
                    usuario: userId || 'sistema'
                }
            );
            
            // Aprender com a decisão
            await this.aprenderComDecisao(fileId, categoryId);
        }

        /**
         * Sistema de aprendizado básico
         * @private
         */
        async aprenderComDecisao(fileId, categoryId) {
            // Buscar análise anterior da IA
            const analisesIA = this.buscar({
                legado: fileId,
                presente: 'foiAnalisadoComo'
            });
            
            if (analisesIA.length > 0) {
                const tipoAnalise = analisesIA[0].objetivo.valor;
                
                // Criar correlação: tipo de análise -> correlaciona com -> categoria
                await this.adicionarTripla(
                    tipoAnalise,
                    'correlacionaCom',
                    categoryId,
                    {
                        fonte: 'aprendizado',
                        confianca: 0.85,
                        baseadoEm: fileId
                    }
                );
            }
        }

        /**
         * Salva triplas no localStorage
         * @private
         */
        async saveToStorage() {
            try {
                const dataToSave = {
                    triplas: Array.from(this.triplas.entries()),
                    stats: this.stats,
                    timestamp: new Date().toISOString()
                };
                
                AppState.set('tripleStore', dataToSave);
                
                EventBus.emit(Events.TRIPLE_STORE_SAVED, {
                    totalTriplas: this.stats.totalTriplas
                });
                
            } catch (error) {
                this.logger.error('TripleStoreManager', 'Erro ao salvar TripleStore:', error);
            }
        }

        /**
         * Carrega triplas do localStorage
         * @private
         */
        async loadFromStorage() {
            try {
                const saved = AppState.get('tripleStore');
                if (!saved) return;
                
                // Restaurar triplas
                if (saved.triplas) {
                    this.triplas = new Map(saved.triplas);
                }
                
                // Reconstruir índices
                this.reconstruirIndices();
                
                // Restaurar estatísticas
                if (saved.stats) {
                    this.stats = saved.stats;
                }
                
                this.logger.info('TripleStoreManager', `Carregadas ${this.triplas.size} triplas do storage`);
                
            } catch (error) {
                this.logger.error('TripleStoreManager', 'Erro ao carregar TripleStore:', error);
            }
        }

        /**
         * Reconstrói todos os índices
         * @private
         */
        reconstruirIndices() {
            // Limpar índices existentes
            Object.values(this.indices).forEach(indice => indice.clear());
            
            // Reconstruir a partir das triplas
            this.triplas.forEach(tripla => {
                this.atualizarIndices(tripla);
            });
        }

        /**
         * Exporta todas as triplas
         */
        exportarTodas() {
            return Array.from(this.triplas.values());
        }

        /**
         * Importa triplas em lote
         */
        async importarTriplas(triplas) {
            let importadas = 0;
            
            for (const tripla of triplas) {
                try {
                    await this.adicionarTripla(
                        tripla.legado.valor,
                        tripla.presente.valor,
                        tripla.objetivo.valor,
                        tripla.metadados
                    );
                    importadas++;
                } catch (error) {
                    this.logger.warn('TripleStoreManager', `Erro ao importar tripla: ${error.message}`);
                }
            }
            
            return importadas;
        }

        /**
         * Obtém estatísticas detalhadas
         */
        obterEstatisticas() {
            return {
                ...this.stats,
                indicesPorLegado: this.indices.porLegado.size,
                indicesPorPresente: this.indices.porPresente.size,
                indicesPorObjetivo: this.indices.porObjetivo.size,
                cacheSize: this.queryCache.size,
                memoriaUsada: this.estimarMemoriaUsada()
            };
        }

        /**
         * Estima memória usada
         * @private
         */
        estimarMemoriaUsada() {
            const jsonString = JSON.stringify(Array.from(this.triplas.values()));
            return (jsonString.length * 2) / 1024 / 1024; // MB aproximados
        }

        /**
         * Limpa dados (para testes)
         */
        limpar() {
            this.triplas.clear();
            Object.values(this.indices).forEach(indice => indice.clear());
            this.queryCache.clear();
            this.stats = {
                totalTriplas: 0,
                triplasPorTipo: {},
                triplasPorFonte: {},
                ultimaAtualizacao: null
            };
        }
    }

    // Registrar no namespace global
    KC.TripleStoreManager = TripleStoreManager;

    // Auto-inicializar se o sistema já estiver pronto
    if (KC.initialized) {
        KC.tripleStore = new TripleStoreManager();
        KC.tripleStore.initialize().catch(console.error);
    }

})(window);
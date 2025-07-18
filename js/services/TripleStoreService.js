/**
 * TripleStoreService.js
 * 
 * Serviço centralizado para operações de triplas semânticas
 * Fornece interface simplificada para integração com o Knowledge Consolidator
 * 
 * @version 1.0.0
 * @date 2025-01-17
 */

(function(window) {
    'use strict';
    
    const KC = window.KnowledgeConsolidator || {};
    
    // Importar dependências do namespace global
    const EventBus = KC.EventBus;
    const Events = KC.Events || {};
    const AppState = KC.AppState;
    const Logger = KC.Logger;
    const TripleStoreManager = KC.TripleStoreManager;
    const RelationshipExtractor = KC.RelationshipExtractor;

    // Novos eventos para triplas
    Events.TRIPLES_UPDATED = 'triples_updated';
    Events.TRIPLES_EXTRACTED = 'triples_extracted';
    Events.INSIGHTS_GENERATED = 'insights_generated';
    Events.TRIPLE_LEARNING = 'triple_learning';

class TripleStoreService {
    constructor() {
        this.manager = null;
        this.extractor = null;
        this.initialized = false;
        this.cache = new Map();
        this.extractionQueue = [];
        this.isProcessing = false;
        
        // Estatísticas
        this.stats = {
            totalTriplas: 0,
            triplasPorTipo: {},
            extracoesConcluidas: 0,
            tempoMedioExtracao: 0,
            insightsGerados: 0
        };
    }

    /**
     * Inicializa o serviço
     */
    async inicializar() {
        if (this.initialized) {
            Logger.info('TripleStoreService', 'Serviço já inicializado');
            return;
        }

        try {
            Logger.info('TripleStoreService', 'Inicializando serviço de triplas...');
            
            // Inicializar componentes
            this.manager = new TripleStoreManager();
            
            this.extractor = new RelationshipExtractor();
            
            // Carregar estado do AppState se existir
            const savedTriples = AppState.get('triples');
            if (savedTriples) {
                await this.manager.importarTriplas(savedTriples);
                Logger.info('TripleStoreService', `${savedTriples.length} triplas carregadas do estado`);
            }
            
            // Configurar listeners
            this.configurarListeners();
            
            // Atualizar estatísticas
            await this.atualizarEstatisticas();
            
            this.initialized = true;
            Logger.success('TripleStoreService', 'Serviço inicializado com sucesso');
            
            // Emitir evento de inicialização
            EventBus.emit(Events.TRIPLES_UPDATED, {
                action: 'initialized',
                stats: this.stats
            });
            
        } catch (erro) {
            Logger.error('TripleStoreService', 'Erro ao inicializar', erro);
            throw erro;
        }
    }

    /**
     * Configura listeners de eventos
     */
    configurarListeners() {
        // Salvar triplas quando atualizadas
        EventBus.on(Events.TRIPLES_UPDATED, async (data) => {
            if (data.action !== 'initialized') {
                await this.salvarEstado();
            }
        });

        // Processar fila quando arquivos forem analisados
        EventBus.on(Events.ANALYSIS_COMPLETED, async (data) => {
            if (data.file && data.analysis) {
                await this.extrairTriplasDeAnalise(data.file, data.analysis);
            }
        });

        // Aprender com feedback do usuário
        EventBus.on(Events.TRIPLE_LEARNING, async (data) => {
            await this.processarFeedback(data);
        });
    }

    /**
     * Extrai triplas de um arquivo
     */
    async extrairTriplas(arquivo, opcoes = {}) {
        try {
            Logger.info('TripleStoreService', `Extraindo triplas de ${arquivo.name}`);
            
            const inicio = Date.now();
            
            // Verificar cache
            const cacheKey = `${arquivo.id}_${arquivo.lastModified}`;
            if (this.cache.has(cacheKey) && !opcoes.forceExtraction) {
                Logger.info('TripleStoreService', 'Retornando triplas do cache');
                return this.cache.get(cacheKey);
            }
            
            // Preparar dados para extração
            const dadosArquivo = {
                nome: arquivo.name,
                caminho: arquivo.path,
                conteudo: arquivo.content || arquivo.preview || '',
                tipo: arquivo.type,
                tamanho: arquivo.size,
                dataModificacao: arquivo.lastModified,
                categorias: arquivo.categories || [],
                metadados: {
                    relevanceScore: arquivo.relevanceScore,
                    analysisType: arquivo.analysisType,
                    ...arquivo.metadata
                }
            };
            
            // Extrair relações
            const relacoes = await this.extractor.extrairDeArquivo(arquivo);
            
            // Adicionar ao manager
            const triplasAdicionadas = [];
            for (const tripla of relacoes) {
                try {
                    const triplaAdicionada = await this.manager.adicionarTripla(
                        tripla.legado.valor,
                        tripla.presente.valor,
                        tripla.objetivo.valor,
                        {
                            ...tripla.metadados,
                            arquivoOrigem: arquivo.id,
                            confianca: tripla.metadados.confianca || 0.8
                        }
                    );
                    
                    if (triplaAdicionada) {
                        triplasAdicionadas.push(triplaAdicionada);
                    }
                } catch (erro) {
                    Logger.warn('TripleStoreService', `Erro ao adicionar tripla: ${erro.message}`);
                }
            }
            // Cachear resultado
            this.cache.set(cacheKey, triplasAdicionadas);
            
            // Limpar cache se muito grande
            if (this.cache.size > 100) {
                const keys = Array.from(this.cache.keys());
                this.cache.delete(keys[0]); // Remove mais antigo
            }
            
            const duracao = Date.now() - inicio;
            
            // Atualizar estatísticas
            this.stats.extracoesConcluidas++;
            this.stats.tempoMedioExtracao = 
                (this.stats.tempoMedioExtracao * (this.stats.extracoesConcluidas - 1) + duracao) / 
                this.stats.extracoesConcluidas;
            
            Logger.success('TripleStoreService', 
                `${triplasAdicionadas.length} triplas extraídas em ${duracao}ms`);
            
            // Emitir evento
            EventBus.emit(Events.TRIPLES_EXTRACTED, {
                arquivo: arquivo.id,
                triplas: triplasAdicionadas,
                duracao
            });
            
            await this.atualizarEstatisticas();
            
            return triplasAdicionadas;
            
        } catch (erro) {
            Logger.error('TripleStoreService', 'Erro ao extrair triplas', erro);
            return [];
        }
    }

    /**
     * Extrai triplas de múltiplos arquivos em batch
     */
    async extrairTriplasBatch(arquivos, opcoes = {}) {
        const { 
            batchSize = 5,
            onProgress = () => {},
            continueOnError = true 
        } = opcoes;
        
        Logger.info('TripleStoreService', `Processando ${arquivos.length} arquivos em batches de ${batchSize}`);
        
        const resultados = [];
        const erros = [];
        
        for (let i = 0; i < arquivos.length; i += batchSize) {
            const batch = arquivos.slice(i, i + batchSize);
            
            const promessas = batch.map(arquivo => 
                this.extrairTriplas(arquivo, opcoes)
                    .catch(erro => {
                        if (continueOnError) {
                            erros.push({ arquivo: arquivo.name, erro });
                            return [];
                        }
                        throw erro;
                    })
            );
            
            const resultadosBatch = await Promise.all(promessas);
            resultados.push(...resultadosBatch.flat());
            
            // Callback de progresso
            onProgress({
                processados: Math.min(i + batchSize, arquivos.length),
                total: arquivos.length,
                porcentagem: Math.min(100, ((i + batchSize) / arquivos.length) * 100)
            });
        }
        
        Logger.info('TripleStoreService', 
            `Extração concluída: ${resultados.length} triplas de ${arquivos.length} arquivos`);
        
        if (erros.length > 0) {
            Logger.warn('TripleStoreService', `${erros.length} erros durante extração`, erros);
        }
        
        return { triplas: resultados, erros };
    }

    /**
     * Busca triplas com filtros
     */
    async buscarTriplas(filtros = {}) {
        try {
            const resultados = await this.manager.buscar(filtros);
            return resultados;
        } catch (erro) {
            Logger.error('TripleStoreService', 'Erro ao buscar triplas', erro);
            return [];
        }
    }

    /**
     * Gera insights baseados nas triplas
     */
    async gerarInsights(contexto = {}) {
        try {
            Logger.info('TripleStoreService', 'Gerando insights...');
            
            const insights = [];
            
            // 1. Padrões temporais
            const padroesTemporais = await this.identificarPadroesTemporais();
            insights.push(...padroesTemporais);
            
            // 2. Clusters de conhecimento
            const clusters = await this.identificarClusters();
            insights.push(...clusters);
            
            // 3. Relações ocultas
            const relacoesOcultas = await this.descobrirRelacoesOcultas();
            insights.push(...relacoesOcultas);
            
            // 4. Evolução de conceitos
            const evolucoes = await this.analisarEvolucao();
            insights.push(...evolucoes);
            
            // 5. Recomendações baseadas em contexto
            if (contexto.arquivo || contexto.categoria) {
                const recomendacoes = await this.gerarRecomendacoes(contexto);
                insights.push(...recomendacoes);
            }
            
            this.stats.insightsGerados += insights.length;
            
            // Emitir evento
            EventBus.emit(Events.INSIGHTS_GENERATED, {
                insights,
                contexto,
                timestamp: new Date().toISOString()
            });
            
            Logger.success('TripleStoreService', `${insights.length} insights gerados`);
            
            return insights;
            
        } catch (erro) {
            Logger.error('TripleStoreService', 'Erro ao gerar insights', erro);
            return [];
        }
    }

    /**
     * Identifica padrões temporais nas triplas
     */
    async identificarPadroesTemporais() {
        const insights = [];
        
        // Buscar triplas com timestamp
        const triplas = await this.manager.buscar({});
        
        // Agrupar por período
        const porMes = new Map();
        triplas.forEach(tripla => {
            const data = new Date(tripla.metadados.timestamp);
            const chave = `${data.getFullYear()}-${data.getMonth() + 1}`;
            
            if (!porMes.has(chave)) {
                porMes.set(chave, []);
            }
            porMes.get(chave).push(tripla);
        });
        
        // Identificar picos e tendências
        const meses = Array.from(porMes.keys()).sort();
        for (let i = 1; i < meses.length; i++) {
            const mesAtual = porMes.get(meses[i]).length;
            const mesAnterior = porMes.get(meses[i-1]).length;
            
            if (mesAtual > mesAnterior * 1.5) {
                insights.push({
                    tipo: 'padrao_temporal',
                    titulo: 'Pico de Atividade Detectado',
                    descricao: `Aumento de ${Math.round((mesAtual/mesAnterior - 1) * 100)}% em ${meses[i]}`,
                    relevancia: 0.8,
                    dados: { mes: meses[i], quantidade: mesAtual }
                });
            }
        }
        
        return insights;
    }

    /**
     * Identifica clusters de conhecimento
     */
    async identificarClusters() {
        const insights = [];
        
        // Buscar todas as triplas
        const triplas = await this.manager.buscar({});
        
        // Agrupar por sujeito
        const clusters = new Map();
        triplas.forEach(tripla => {
            const sujeito = tripla.legado.valor;
            if (!clusters.has(sujeito)) {
                clusters.set(sujeito, new Set());
            }
            clusters.get(sujeito).add(tripla.objetivo.valor);
        });
        
        // Identificar clusters significativos
        for (const [sujeito, objetivos] of clusters) {
            if (objetivos.size >= 5) {
                insights.push({
                    tipo: 'cluster_conhecimento',
                    titulo: 'Hub de Conhecimento Identificado',
                    descricao: `"${sujeito}" conecta ${objetivos.size} conceitos diferentes`,
                    relevancia: Math.min(0.5 + (objetivos.size * 0.1), 1.0),
                    dados: { 
                        hub: sujeito, 
                        conexoes: objetivos.size,
                        exemplos: Array.from(objetivos).slice(0, 3)
                    }
                });
            }
        }
        
        return insights;
    }

    /**
     * Descobre relações ocultas entre conceitos
     */
    async descobrirRelacoesOcultas() {
        const insights = [];
        
        // Implementação simplificada: busca por transitividade
        // Se A->B e B->C, então sugere A->C
        
        const triplas = await this.manager.buscar({});
        const relacoes = new Map();
        
        // Mapear relações diretas
        triplas.forEach(tripla => {
            const chave = `${tripla.legado.valor}:${tripla.presente.valor}`;
            if (!relacoes.has(tripla.legado.valor)) {
                relacoes.set(tripla.legado.valor, new Set());
            }
            relacoes.get(tripla.legado.valor).add(tripla.objetivo.valor);
        });
        
        // Buscar relações transitivas
        for (const [a, conjuntoB] of relacoes) {
            for (const b of conjuntoB) {
                if (relacoes.has(b)) {
                    for (const c of relacoes.get(b)) {
                        if (c !== a && !conjuntoB.has(c)) {
                            insights.push({
                                tipo: 'relacao_oculta',
                                titulo: 'Conexão Indireta Descoberta',
                                descricao: `"${a}" pode estar relacionado com "${c}" através de "${b}"`,
                                relevancia: 0.7,
                                dados: { origem: a, intermediario: b, destino: c }
                            });
                        }
                    }
                }
            }
        }
        
        return insights.slice(0, 10); // Limitar a 10 mais relevantes
    }

    /**
     * Analisa evolução de conceitos ao longo do tempo
     */
    async analisarEvolucao() {
        const insights = [];
        
        // Buscar triplas com predicado indicando evolução
        const evolucoes = await this.manager.buscar({
            presente: ['evoluiuDe', 'transformouEm', 'migrouPara', 'atualizadoPara']
        });
        
        // Criar cadeias de evolução
        const cadeias = new Map();
        evolucoes.forEach(tripla => {
            const origem = tripla.legado.valor;
            const destino = tripla.objetivo.valor;
            
            // Encontrar ou criar cadeia
            let cadeiaEncontrada = false;
            for (const [id, cadeia] of cadeias) {
                if (cadeia[cadeia.length - 1] === origem) {
                    cadeia.push(destino);
                    cadeiaEncontrada = true;
                    break;
                }
            }
            
            if (!cadeiaEncontrada) {
                cadeias.set(cadeias.size, [origem, destino]);
            }
        });
        
        // Gerar insights das cadeias
        for (const [id, cadeia] of cadeias) {
            if (cadeia.length >= 3) {
                insights.push({
                    tipo: 'evolucao_conceito',
                    titulo: 'Evolução de Conceito Detectada',
                    descricao: `Transformação progressiva: ${cadeia.join(' → ')}`,
                    relevancia: 0.6 + (cadeia.length * 0.1),
                    dados: { cadeia, etapas: cadeia.length }
                });
            }
        }
        
        return insights;
    }

    /**
     * Gera recomendações baseadas em contexto
     */
    async gerarRecomendacoes(contexto) {
        const recomendacoes = [];
        
        if (contexto.arquivo) {
            // Buscar arquivos similares
            const triplasArquivo = await this.manager.buscar({
                metadados: { arquivoOrigem: contexto.arquivo }
            });
            
            // Encontrar arquivos com triplas similares
            const arquivosSimilares = new Set();
            for (const tripla of triplasArquivo) {
                const similares = await this.manager.buscar({
                    objetivo: tripla.objetivo.valor
                });
                
                similares.forEach(s => {
                    if (s.metadados.arquivoOrigem !== contexto.arquivo) {
                        arquivosSimilares.add(s.metadados.arquivoOrigem);
                    }
                });
            }
            
            if (arquivosSimilares.size > 0) {
                recomendacoes.push({
                    tipo: 'recomendacao_arquivo',
                    titulo: 'Arquivos Relacionados',
                    descricao: `${arquivosSimilares.size} arquivos compartilham conceitos similares`,
                    relevancia: 0.8,
                    dados: { arquivos: Array.from(arquivosSimilares).slice(0, 5) }
                });
            }
        }
        
        if (contexto.categoria) {
            // Sugerir categorias relacionadas
            const triplasCategoria = await this.manager.buscar({
                legado: contexto.categoria
            });
            
            const categoriasRelacionadas = new Set();
            triplasCategoria.forEach(t => {
                if (t.objetivo.valor !== contexto.categoria) {
                    categoriasRelacionadas.add(t.objetivo.valor);
                }
            });
            
            if (categoriasRelacionadas.size > 0) {
                recomendacoes.push({
                    tipo: 'recomendacao_categoria',
                    titulo: 'Categorias Relacionadas',
                    descricao: `Expandir busca para categorias conectadas`,
                    relevancia: 0.7,
                    dados: { categorias: Array.from(categoriasRelacionadas) }
                });
            }
        }
        
        return recomendacoes;
    }

    /**
     * Extrai triplas de resultado de análise IA
     */
    async extrairTriplasDeAnalise(arquivo, analise) {
        try {
            Logger.info('TripleStoreService', 'Extraindo triplas de análise IA');
            
            const triplasAnalise = [];
            
            // Extrair do tipo de análise
            if (analise.analysisType) {
                triplasAnalise.push({
                    sujeito: arquivo.name,
                    predicado: 'classificadoComo',
                    objeto: analise.analysisType,
                    metadados: { fonte: 'analise_ia', confianca: 0.9 }
                });
            }
            
            // Extrair insights
            if (analise.insights && Array.isArray(analise.insights)) {
                for (const insight of analise.insights) {
                    triplasAnalise.push({
                        sujeito: arquivo.name,
                        predicado: 'geraInsight',
                        objeto: insight,
                        metadados: { fonte: 'analise_ia', tipo: 'insight' }
                    });
                }
            }
            
            // Extrair categorias sugeridas
            if (analise.suggestedCategories) {
                for (const categoria of analise.suggestedCategories) {
                    triplasAnalise.push({
                        sujeito: arquivo.name,
                        predicado: 'sugeridaCategoria',
                        objeto: categoria,
                        metadados: { fonte: 'analise_ia', confianca: 0.8 }
                    });
                }
            }
            
            // Adicionar triplas ao store
            const adicionadas = [];
            for (const tripla of triplasAnalise) {
                const resultado = await this.manager.adicionarTripla(
                    tripla.sujeito,
                    tripla.predicado,
                    tripla.objeto,
                    { ...tripla.metadados, arquivoOrigem: arquivo.id }
                );
                
                if (resultado.sucesso) {
                    adicionadas.push(resultado.tripla);
                }
            }
            
            Logger.success('TripleStoreService', 
                `${adicionadas.length} triplas extraídas da análise`);
            
            return adicionadas;
            
        } catch (erro) {
            Logger.error('TripleStoreService', 'Erro ao extrair triplas de análise', erro);
            return [];
        }
    }

    /**
     * Processa feedback do usuário sobre triplas
     */
    async processarFeedback(feedback) {
        try {
            const { triplaId, acao, novoValor } = feedback;
            
            switch (acao) {
                case 'confirmar':
                    // Por enquanto, apenas logar o feedback
                    Logger.info('TripleStoreService', `Tripla ${triplaId} confirmada pelo usuário`);
                    break;
                    
                case 'rejeitar':
                    // Por enquanto, apenas logar o feedback
                    Logger.info('TripleStoreService', `Tripla ${triplaId} rejeitada pelo usuário`);
                    break;
                    
                case 'corrigir':
                    // Por enquanto, apenas logar o feedback
                    Logger.info('TripleStoreService', `Tripla ${triplaId} corrigida pelo usuário`);
                    break;
            }
            
            Logger.info('TripleStoreService', 
                `Feedback processado: ${acao} para tripla ${triplaId}`);
            
            // Emitir evento para outros componentes
            EventBus.emit(Events.TRIPLE_LEARNING, {
                feedback,
                processado: true
            });
            
        } catch (erro) {
            Logger.error('TripleStoreService', 'Erro ao processar feedback', erro);
        }
    }

    /**
     * Atualiza estatísticas
     */
    async atualizarEstatisticas() {
        const todasTriplas = await this.manager.buscar({});
        
        this.stats.totalTriplas = todasTriplas.length;
        
        // Contar por tipo de predicado
        this.stats.triplasPorTipo = {};
        todasTriplas.forEach(tripla => {
            const tipo = tripla.presente.valor;
            this.stats.triplasPorTipo[tipo] = (this.stats.triplasPorTipo[tipo] || 0) + 1;
        });
        
        // Emitir atualização
        EventBus.emit(Events.TRIPLES_UPDATED, {
            action: 'stats_updated',
            stats: this.stats
        });
    }

    /**
     * Salva estado no AppState
     */
    async salvarEstado() {
        try {
            const triplas = await this.manager.exportarTodas();
            AppState.set('triples', triplas);
            AppState.set('tripleStats', this.stats);
            
            Logger.info('TripleStoreService', `Estado salvo: ${triplas.length} triplas`);
        } catch (erro) {
            Logger.error('TripleStoreService', 'Erro ao salvar estado', erro);
        }
    }

    /**
     * Exporta dados para integração
     */
    async exportarParaIntegracao(formato = 'qdrant') {
        try {
            const triplas = await this.manager.buscar({});
            
            switch (formato) {
                case 'qdrant':
                    return this.exportarParaQdrant(triplas);
                case 'n8n':
                    return this.exportarParaN8N(triplas);
                case 'json':
                    return triplas;
                default:
                    throw new Error(`Formato não suportado: ${formato}`);
            }
        } catch (erro) {
            Logger.error('TripleStoreService', 'Erro ao exportar', erro);
            throw erro;
        }
    }

    /**
     * Exporta para formato Qdrant
     */
    exportarParaQdrant(triplas) {
        return triplas.map(tripla => ({
            id: tripla.id,
            vector: null, // Será preenchido pelo embedding service
            payload: {
                legado: tripla.legado.valor,
                presente: tripla.presente.valor,
                objetivo: tripla.objetivo.valor,
                tipo_legado: tripla.legado.tipo,
                tipo_objetivo: tripla.objetivo.tipo,
                metadados: tripla.metadados,
                texto_busca: `${tripla.legado.valor} ${tripla.presente.valor} ${tripla.objetivo.valor}`
            }
        }));
    }

    /**
     * Exporta para formato N8N
     */
    exportarParaN8N(triplas) {
        return {
            nodes: Array.from(new Set(
                triplas.flatMap(t => [t.legado.valor, t.objetivo.valor])
            )).map((node, idx) => ({
                id: `node_${idx}`,
                label: node,
                type: 'concept'
            })),
            
            edges: triplas.map(t => ({
                source: t.legado.valor,
                target: t.objetivo.valor,
                label: t.presente.valor,
                metadata: t.metadados
            }))
        };
    }

    /**
     * Limpa cache e recursos
     */
    limpar() {
        this.cache.clear();
        this.extractionQueue = [];
        this.isProcessing = false;
        Logger.info('TripleStoreService', 'Cache e recursos limpos');
    }
}

    // Expor no namespace KC
    KC.TripleStoreService = new TripleStoreService();
    
    // Garantir que o namespace global existe
    window.KnowledgeConsolidator = KC;
    
})(window);